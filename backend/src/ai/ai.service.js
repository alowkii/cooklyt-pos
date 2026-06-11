const llm = require('./llm.client');
const repo = require('./ai.repository');
const settingsRepo = require('../settings/settings.repository');
const ingredientsService = require('../ingredients/ingredients.service');
const wasteService = require('../waste/waste.service');
const ordersService = require('../orders/orders.service');
const { ValidationError } = require('../shared/errors');

const WASTE_REASONS = ['SPOILAGE', 'SPILL', 'OVERPREP', 'DAMAGED', 'OTHER'];
const HISTORY_LIMIT = 20;

// ── Tool schemas (OpenAI function format) ───────────────────────────────────

const days  = { type: 'integer', description: 'How many days back to look (default 7)' };
const limit = { type: 'integer', description: 'Max rows to return' };

const TOOLS = [
  { type: 'function', function: { name: 'get_waste_summary',      description: 'Waste events and total cost grouped by reason (SPOILAGE, SPILL, OVERPREP, DAMAGED, OTHER) over the last N days.', parameters: { type: 'object', properties: { days }, required: [] } } },
  { type: 'function', function: { name: 'get_top_wasted_items',   description: 'Most-wasted ingredients by cost over the last N days, with quantities.', parameters: { type: 'object', properties: { days, limit }, required: [] } } },
  { type: 'function', function: { name: 'get_low_stock',          description: 'Ingredients at or below their reorder level right now, with stock on hand and unit cost.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_inventory_movements', description: 'Stock movements (purchases, sales deductions, waste, adjustments) per ingredient over the last N days.', parameters: { type: 'object', properties: { days }, required: [] } } },
  { type: 'function', function: { name: 'get_recipe_costs',       description: 'Every recipe with its ingredient cost, linked menu price, and food-cost percentage (cost ÷ price). High percentages mean thin margins.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_sales_velocity',     description: 'Best-selling menu items over the last N days: quantity sold, revenue, average per day.', parameters: { type: 'object', properties: { days, limit }, required: [] } } },
  { type: 'function', function: { name: 'get_recent_orders',      description: 'The most recent orders with status, channel, items, and amount.', parameters: { type: 'object', properties: { limit }, required: [] } } },
  { type: 'function', function: { name: 'get_menu_items',         description: 'Browse the menu. ALWAYS pass the user\'s constraints as filters (e.g. "under 200" → max_price: 200) instead of filtering the results yourself.', parameters: { type: 'object', properties: { max_price: { type: 'number', description: 'Only items priced at or below this' }, min_price: { type: 'number', description: 'Only items priced at or above this' }, category: { type: 'string', description: 'Exact category name' }, name_contains: { type: 'string', description: 'Partial item name' } }, required: [] } } },
  { type: 'function', function: { name: 'find_ingredient',        description: 'Look up ingredients by (partial) name. Use before update_reorder_level or log_waste to resolve the exact ingredient.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'Full or partial ingredient name' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'update_reorder_level',   description: 'WRITE ACTION (user must confirm): change an ingredient\'s reorder level.', parameters: { type: 'object', properties: { ingredient_name: { type: 'string' }, new_level: { type: 'number', description: 'New reorder level in the ingredient\'s unit' } }, required: ['ingredient_name', 'new_level'] } } },
  { type: 'function', function: { name: 'log_waste',              description: `WRITE ACTION (user must confirm): record wasted stock of an ingredient. reason must be one of ${WASTE_REASONS.join(', ')}.`, parameters: { type: 'object', properties: { ingredient_name: { type: 'string' }, quantity: { type: 'number', description: 'Wasted amount in the ingredient\'s unit' }, reason: { type: 'string', enum: WASTE_REASONS }, notes: { type: 'string' } }, required: ['ingredient_name', 'quantity', 'reason'] } } },
  { type: 'function', function: { name: 'get_tables',             description: 'All tables with their number, status (available / occupied / reserved / cleaning), and seats. Check this before placing a dining order.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_active_orders',      description: 'Orders that are not yet paid or cancelled, with order ref, table, items, and amount. Use to find an order before cancelling it.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'place_order',            description: 'WRITE ACTION (user must confirm): place a dining order on a table. Ask the user for the table number and the items with quantities first if you do not have them.', parameters: { type: 'object', properties: { table_number: { type: 'integer' }, items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string', description: 'Menu item name' }, quantity: { type: 'integer' }, notes: { type: 'string', description: 'Special instructions, e.g. no onions' } }, required: ['name', 'quantity'] } } }, required: ['table_number', 'items'] } } },
  { type: 'function', function: { name: 'cancel_order',           description: 'WRITE ACTION (user must confirm): cancel an active order. Identify it by order_ref or table_number; if both are missing, use get_active_orders and ask the user which one.', parameters: { type: 'object', properties: { order_ref: { type: 'string', description: 'Order reference like 2606A018' }, table_number: { type: 'integer', description: 'Table the order is on' } }, required: [] } } },
];

const SYSTEM_PROMPT = `You are CookLyt's assistant for restaurant staff. You answer questions about waste, inventory, recipes, sales, and orders using the provided tools.

Rules:
- Always fetch data through tools — never invent numbers. If a tool returns no rows, say so plainly.
- Be concise. Staff are mid-shift; lead with the answer, use short lists over prose.
- Monetary amounts are in the restaurant's local currency.
- Write actions (changing reorder levels, logging waste) are proposed via tools and the user confirms them in the UI — never claim an action is done unless a tool result says so.
- If an ingredient name is ambiguous, use find_ingredient and ask the user which one they mean.
- Conversation history contains only text, not the underlying data. If a follow-up needs a field you no longer have (e.g. perishability, cost), call the tool again — never answer from general knowledge.
- When the user states a constraint (price limit, category, time range), pass it as a tool parameter so the data comes back pre-filtered. Before answering, check every item you list actually satisfies the user's constraints.
- Every data question must be answered from a tool call made in THIS turn. Never reuse lists or numbers from earlier messages, even when the new question looks similar to a previous one — the constraint may have changed.
- You can place dining orders and cancel orders. Before calling place_order, you need the table number and the items with quantities — ask the user for whatever is missing, one question at a time.
- When a write tool returns an error with options (occupied table with available alternatives, ambiguous item, multiple matching orders), relay those options to the user and wait for their choice. Do not pick for them.`;

// ── Tool execution ───────────────────────────────────────────────────────────

const READ_TOOLS = {
  get_waste_summary:       (rid, a) => repo.getWasteSummary(rid, a.days ?? 7),
  get_top_wasted_items:    (rid, a) => repo.getTopWastedItems(rid, a.days ?? 7, a.limit ?? 10),
  get_low_stock:           (rid)    => repo.getLowStock(rid),
  get_inventory_movements: (rid, a) => repo.getInventoryMovements(rid, a.days ?? 7),
  get_recipe_costs:        (rid)    => repo.getRecipeCosts(rid),
  get_sales_velocity:      (rid, a) => repo.getSalesVelocity(rid, a.days ?? 7, a.limit ?? 15),
  get_recent_orders:       (rid, a) => repo.getRecentOrders(rid, a.limit ?? 10),
  get_menu_items:          (rid, a) => repo.getMenuItems(rid, { maxPrice: a.max_price, minPrice: a.min_price, category: a.category, nameContains: a.name_contains }),
  get_tables:              (rid)    => repo.getTables(rid),
  get_active_orders:       (rid)    => repo.getActiveOrders(rid),
  find_ingredient:         (rid, a) => repo.findIngredientsByName(rid, a.name || ''),
};

async function preparePlaceOrder(restaurantId, args) {
  const tableNumber = Number(args.table_number);
  if (!Number.isInteger(tableNumber)) return { error: 'table_number must be an integer' };
  if (!Array.isArray(args.items) || !args.items.length) return { error: 'items must be a non-empty array' };

  const table = await repo.getTableByNumber(restaurantId, tableNumber);
  if (!table) {
    const tables = await repo.getTables(restaurantId);
    return { error: `There is no table ${tableNumber}`, existingTables: tables.map((t) => t.number) };
  }
  if (table.status !== 'available') {
    const tables = await repo.getTables(restaurantId);
    return {
      error: `Table ${tableNumber} is ${table.status}`,
      availableTables: tables.filter((t) => t.status === 'available').map((t) => `Table ${t.number} (${t.seats} seats)`),
    };
  }

  const resolved = [];
  let total = 0;
  for (const item of args.items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) return { error: `Quantity for "${item.name}" must be a positive integer` };
    const matches = await repo.findMenuItemsByName(restaurantId, item.name || '');
    const exact = matches.find((m) => m.name.toLowerCase() === (item.name || '').toLowerCase());
    const pick = exact || (matches.length === 1 ? matches[0] : null);
    if (!pick) {
      if (!matches.length) return { error: `No menu item matching "${item.name}"` };
      return { error: `"${item.name}" is ambiguous — ask the user which one`, candidates: matches.map((m) => m.name) };
    }
    if (!pick.available) return { error: `${pick.name} is currently unavailable` };
    resolved.push({ menuItemId: pick.id, name: pick.name, quantity: qty, notes: item.notes || null, price: Number(pick.price) });
    total += Number(pick.price) * qty;
  }

  return {
    confirmRequired: true,
    summary: `Place order on Table ${tableNumber}: ${resolved.map((i) => `${i.quantity}× ${i.name}`).join(', ')} — total ${total.toFixed(2)}`,
    tableId: table.id,
    tableNumber,
    items: resolved.map(({ menuItemId, name, quantity, notes }) => ({ menuItemId, name, quantity, notes })),
  };
}

async function prepareCancelOrder(restaurantId, args) {
  const active = await repo.getActiveOrders(restaurantId);
  if (!active.length) return { error: 'There are no active orders to cancel' };

  let candidates = active;
  if (args.order_ref)    candidates = candidates.filter((o) => o.order_ref?.toLowerCase() === String(args.order_ref).toLowerCase());
  if (args.table_number) candidates = candidates.filter((o) => o.table_number === Number(args.table_number));

  if (!candidates.length) {
    return {
      error: 'No active order matches that',
      activeOrders: active.map((o) => `${o.order_ref} (${o.table_number ? `Table ${o.table_number}` : o.channel}, ${o.items || 'no items'}, ${o.amount})`),
    };
  }
  if (candidates.length > 1) {
    return {
      error: 'Multiple active orders match — ask the user which one',
      candidates: candidates.map((o) => `${o.order_ref} (${o.table_number ? `Table ${o.table_number}` : o.channel}, ${o.items || 'no items'}, ${o.amount})`),
    };
  }

  const order = candidates[0];
  return {
    confirmRequired: true,
    summary: `Cancel order ${order.order_ref}${order.table_number ? ` on Table ${order.table_number}` : ''} (${order.items || 'no items'} — ${order.amount})`,
    orderId: order.id,
    orderRef: order.order_ref,
  };
}

// Resolve a write tool's arguments into a concrete, confirmable action.
// Returns { confirmRequired, summary, ...resolved } to halt the loop, or a plain
// object (error / candidates) that goes back to the model as a tool result.
async function prepareWriteAction(restaurantId, toolName, args) {
  if (toolName === 'place_order')  return preparePlaceOrder(restaurantId, args);
  if (toolName === 'cancel_order') return prepareCancelOrder(restaurantId, args);

  const matches = await repo.findIngredientsByName(restaurantId, args.ingredient_name || '');
  if (!matches.length) return { error: `No ingredient found matching "${args.ingredient_name}"` };
  if (matches.length > 1) {
    const exact = matches.find((m) => m.name.toLowerCase() === (args.ingredient_name || '').toLowerCase());
    if (!exact) return { error: 'Multiple ingredients match — ask the user which one they mean', candidates: matches.map((m) => m.name) };
    matches[0] = exact;
  }
  const ing = matches[0];

  if (toolName === 'update_reorder_level') {
    const newLevel = Number(args.new_level);
    if (!Number.isFinite(newLevel) || newLevel < 0) return { error: 'new_level must be a non-negative number' };
    return {
      confirmRequired: true,
      summary: `Change reorder level for ${ing.name} from ${ing.reorder_level} to ${newLevel} ${ing.unit}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      newLevel,
    };
  }

  if (toolName === 'log_waste') {
    const quantity = Number(args.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'quantity must be a positive number' };
    if (!WASTE_REASONS.includes(args.reason)) return { error: `reason must be one of: ${WASTE_REASONS.join(', ')}` };
    return {
      confirmRequired: true,
      summary: `Log ${quantity} ${ing.unit} of ${ing.name} as ${args.reason} waste`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity,
      reason: args.reason,
      notes: args.notes || null,
    };
  }

  return { error: `Unknown write tool: ${toolName}` };
}

async function executeTool(restaurantId, toolName, args) {
  console.log(`[ai] tool_call ${toolName} ${JSON.stringify(args || {})}`);
  if (READ_TOOLS[toolName]) return READ_TOOLS[toolName](restaurantId, args || {});
  return prepareWriteAction(restaurantId, toolName, args || {});
}

// ── Chat (streaming) ─────────────────────────────────────────────────────────

// The model has no clock — without this it hallucinates dates from training data.
function dateContext(settings) {
  const timezone = settings.timezone || 'UTC';
  let line;
  try {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now);
    const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
    const time    = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    line = `It is currently ${weekday}, ${isoDate}, ${time} (${timezone}).`;
  } catch {
    line = `It is currently ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (UTC).`;
  }
  if (settings.currency) line += ` Amounts are in ${settings.currency}.`;
  return line;
}

async function buildMessages(sessionId, restaurantId, userMessage) {
  const [history, settings] = await Promise.all([
    repo.getSessionMessages(sessionId, restaurantId, HISTORY_LIMIT),
    settingsRepo.getAll(restaurantId).catch(() => ({})),
  ]);
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${dateContext(settings)}` },
    ...history,
    { role: 'user', content: userMessage },
  ];
}

/**
 * One chat turn as an async generator. Yields:
 *   { type: 'text', delta }
 *   { type: 'confirm_required', tool, args, summary }
 *   { type: 'done' }
 * Handles the tool loop internally; persists the user message and final
 * assistant text to ai_conversations.
 */
async function* streamChat({ sessionId, restaurantId, userId, message }) {
  if (!sessionId)              throw new ValidationError('sessionId is required');
  if (!message?.trim())        throw new ValidationError('message is required');

  const messages = await buildMessages(sessionId, restaurantId, message.trim());
  await repo.saveMessage({ sessionId, restaurantId, userId, role: 'user', content: message.trim() });

  const MAX_ROUNDS = 5;
  let assistantText = '';

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundText = '';
    let toolCalls = null;

    // Low temperature: data answers must be driven by tool results, not sampling
    // creativity — at default temp the model occasionally reuses stale history
    // instead of calling a tool. Avoid 0 exactly (greedy decoding can loop).
    for await (const ev of llm.chatStream(messages, { tools: TOOLS, temperature: 0.2 })) {
      if (ev.type === 'text') {
        roundText += ev.delta;
        yield { type: 'text', delta: ev.delta };
      }
      if (ev.type === 'tool_calls') toolCalls = ev.toolCalls;
    }
    assistantText += roundText;

    if (!toolCalls) break;

    messages.push({ role: 'assistant', content: roundText, tool_calls: toolCalls });

    for (const call of toolCalls) {
      const name = call.function?.name;
      let args = {};
      try { args = JSON.parse(call.function?.arguments || '{}'); } catch { /* model sent bad JSON — fall through with {} */ }

      const result = await executeTool(restaurantId, name, args);

      if (result?.confirmRequired) {
        const { confirmRequired, summary, ...resolved } = result;
        if (assistantText.trim()) {
          await repo.saveMessage({ sessionId, restaurantId, userId, role: 'assistant', content: assistantText.trim() });
        }
        yield { type: 'confirm_required', tool: name, args: resolved, summary };
        yield { type: 'done' };
        return;
      }

      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? null) });
    }
  }

  if (assistantText.trim()) {
    await repo.saveMessage({ sessionId, restaurantId, userId, role: 'assistant', content: assistantText.trim() });
  }
  yield { type: 'done' };
}

// ── Confirmed write execution ────────────────────────────────────────────────

/**
 * Executes a write action the user confirmed in the UI. The args are the
 * resolved payload from the confirm_required event (ingredientId already
 * validated against this restaurant during resolution; services re-check).
 */
async function confirmAction({ sessionId, restaurantId, userId, tool, args, confirmed }) {
  if (!confirmed) {
    await repo.saveMessage({ sessionId, restaurantId, userId, role: 'assistant', content: 'Okay, I won\'t make that change.' });
    return { executed: false, message: 'Action cancelled.' };
  }

  let result;
  let summary;

  if (tool === 'update_reorder_level') {
    result = await ingredientsService.update(args.ingredientId, { reorderLevel: args.newLevel }, restaurantId);
    summary = `Reorder level for ${result.name} set to ${result.reorder_level} ${result.unit}.`;
  } else if (tool === 'log_waste') {
    result = await wasteService.logWaste({
      restaurantId,
      ingredientId: args.ingredientId,
      quantity: args.quantity,
      reason: args.reason,
      notes: args.notes,
      loggedBy: userId,
    });
    summary = `Logged ${result.quantity} ${result.unit} of ${args.ingredientName} as ${result.reason} (cost ${result.total_cost}).`;
  } else if (tool === 'place_order') {
    result = await ordersService.createOrder({
      restaurantId,
      tableId: args.tableId,
      createdBy: userId,
      items: args.items.map(({ menuItemId, quantity, notes }) => ({ menuItemId, quantity, notes })),
      channel: 'dining',
    });
    summary = `Order ${result.order_ref} placed on Table ${args.tableNumber} — sent to the kitchen.`;
  } else if (tool === 'cancel_order') {
    await ordersService.updateStatus(args.orderId, 'cancelled', restaurantId);
    summary = `Order ${args.orderRef} cancelled.`;
  } else {
    throw new ValidationError(`Unknown write tool: ${tool}`);
  }

  await repo.saveMessage({ sessionId, restaurantId, userId, role: 'tool', content: summary, toolName: tool });
  await repo.saveMessage({ sessionId, restaurantId, userId, role: 'assistant', content: summary });
  return { executed: true, message: summary };
}

module.exports = { streamChat, confirmAction, TOOLS };
