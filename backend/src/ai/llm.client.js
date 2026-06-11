// LLM client — speaks the OpenAI-compatible chat-completions API so the provider
// is just configuration: Ollama locally (default), vLLM / llama.cpp / any hosted
// endpoint in production. Nothing outside this file knows which model is running.
//
// Qwen3 note: thinking mode is ON by default and burns hundreds of tokens per turn.
// We disable it per-request unless { think: true } is passed (useful for deep-analysis
// jobs where deliberation helps accuracy). Ollama honors reasoning_effort: 'none';
// the '/no_think' prompt switch is kept as a fallback for other serving stacks.

const { AppError } = require('../shared/errors');

const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const LLM_MODEL    = process.env.LLM_MODEL    || 'qwen3:8b';
const LLM_API_KEY  = process.env.LLM_API_KEY  || 'ollama'; // Ollama ignores it; hosted endpoints require it

const MAX_RETRIES        = 3;
const RETRY_BASE_MS      = 500;
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 120_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Local models occasionally leak <think> blocks into content even with reasoning
// split into its own field — strip them so callers never see chain-of-thought.
function cleanContent(text) {
  return (text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// Append Qwen3's '/no_think' soft switch to the system message (creating one if
// absent). Harmlessly ignored by models that don't support it.
function applyThinkSwitch(messages, think) {
  if (think) return messages;
  const out = messages.map((m) => ({ ...m }));
  const sys = out.find((m) => m.role === 'system');
  if (sys) sys.content = `${sys.content} /no_think`;
  else out.unshift({ role: 'system', content: '/no_think' });
  return out;
}

function buildBody(messages, { tools, temperature, maxTokens, think = false, model, stream = false } = {}) {
  const body = {
    model: model || LLM_MODEL,
    messages: applyThinkSwitch(messages, think),
    stream,
  };
  if (!think)                      body.reasoning_effort = 'none';
  if (tools?.length)               body.tools = tools;
  if (temperature !== undefined)   body.temperature = temperature;
  if (maxTokens !== undefined)     body.max_tokens = maxTokens;
  return body;
}

async function postCompletions(body, { signal } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.ok) return res;

      const text = await res.text().catch(() => '');
      // 4xx (except 429) means the request itself is wrong — retrying won't help
      if (res.status < 500 && res.status !== 429) {
        throw new AppError(`LLM request rejected (${res.status}): ${text.slice(0, 300)}`, 502);
      }
      lastError = new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
    } catch (err) {
      if (err instanceof AppError) throw err;
      lastError = err;
    }
    if (attempt < MAX_RETRIES) await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
  }
  console.error('[llm] all retries failed:', lastError?.message);
  throw new AppError('AI service unavailable', 503);
}

/**
 * Single chat-completion call.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [options] - { tools, temperature, maxTokens, think, model }
 * @returns {Promise<{content: string, toolCalls: Array|null, finishReason: string, usage: object}>}
 */
async function chat(messages, options = {}) {
  const res  = await postCompletions(buildBody(messages, options));
  const json = await res.json();
  const choice = json.choices?.[0];
  if (!choice) throw new AppError('AI service returned an empty response', 502);

  return {
    content:      cleanContent(choice.message?.content),
    toolCalls:    choice.message?.tool_calls?.length ? choice.message.tool_calls : null,
    finishReason: choice.finish_reason,
    usage:        json.usage || {},
  };
}

/**
 * Streaming chat-completion. Async generator yielding:
 *   { type: 'text', delta }        — content tokens as they arrive
 *   { type: 'tool_calls', toolCalls } — assembled tool calls (emitted once, at the end)
 *   { type: 'done', finishReason } — stream finished
 * Reasoning deltas are consumed and discarded.
 */
async function* chatStream(messages, options = {}) {
  const res = await postCompletions(buildBody(messages, { ...options, stream: true }));

  const decoder = new TextDecoder();
  let buffer = '';
  let finishReason = null;
  const toolCalls = []; // accumulated across deltas, keyed by index

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep the trailing partial line

    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '').trim();
      if (!data || data === '[DONE]') continue;

      let parsed;
      try { parsed = JSON.parse(data); } catch { continue; }
      const delta = parsed.choices?.[0]?.delta || {};
      if (parsed.choices?.[0]?.finish_reason) finishReason = parsed.choices[0].finish_reason;

      if (delta.content) yield { type: 'text', delta: delta.content };

      for (const tc of delta.tool_calls || []) {
        const i = tc.index ?? 0;
        if (!toolCalls[i]) toolCalls[i] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } };
        if (tc.id)                 toolCalls[i].id = tc.id;
        if (tc.function?.name)      toolCalls[i].function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
      }
    }
  }

  if (toolCalls.length) yield { type: 'tool_calls', toolCalls };
  yield { type: 'done', finishReason };
}

/**
 * Tool-calling loop: call the model, execute requested tools, feed results back,
 * repeat until the model produces a text answer (or maxRounds is hit).
 *
 * executeTool(name, args) must return a JSON-serializable result, or
 * { confirmRequired: true, ...details } to halt the loop for user confirmation
 * (the write-action flow from AI_PLAN.md — the service layer owns that exchange).
 *
 * Returns { content, pendingConfirm, messages } — messages is the full transcript
 * so the caller can persist it and resume after confirmation.
 */
async function chatWithTools(messages, tools, executeTool, options = {}) {
  const { maxRounds = 5, ...chatOptions } = options;
  const transcript = [...messages];

  for (let round = 0; round < maxRounds; round++) {
    const result = await chat(transcript, { ...chatOptions, tools });

    if (!result.toolCalls) {
      return { content: result.content, pendingConfirm: null, messages: transcript };
    }

    transcript.push({ role: 'assistant', content: result.content || '', tool_calls: result.toolCalls });

    for (const call of result.toolCalls) {
      const name = call.function?.name;
      let args;
      try {
        args = JSON.parse(call.function?.arguments || '{}');
      } catch {
        // Malformed arguments from the model — report back so it can retry
        transcript.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'invalid JSON in tool arguments' }) });
        continue;
      }

      const toolResult = await executeTool(name, args);

      if (toolResult?.confirmRequired) {
        return { content: result.content, pendingConfirm: { tool: name, args, ...toolResult }, messages: transcript };
      }

      transcript.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult ?? null) });
    }
  }

  throw new AppError('AI did not produce an answer within the tool-call limit', 502);
}

/** Liveness check: can we reach the endpoint and is the configured model present? */
async function healthCheck() {
  try {
    const res = await fetch(`${LLM_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${LLM_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    const models = (json.data || []).map((m) => m.id);
    return { ok: true, modelAvailable: models.includes(LLM_MODEL), model: LLM_MODEL, models };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { chat, chatStream, chatWithTools, healthCheck, LLM_MODEL, LLM_BASE_URL };
