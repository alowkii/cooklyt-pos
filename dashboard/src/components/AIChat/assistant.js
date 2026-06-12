// Single source of truth for the assistant's identity, greeting, and prompt
// deck — imported by ChatBubble, Conversation, and AIChat. Rename or re-theme
// the assistant in this one file.

export const ASSISTANT = { name: 'Yumzy', status: 'Reading live data' };

export function greeting(firstName = '') {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${firstName || 'there'}.`;
}

export const PROMPT_GROUPS = [
  {
    label: 'Waste',
    prompts: [
      { short: "This week's waste & cost", full: 'What got wasted this week, and what did it cost?' },
      { short: 'Worst-wasted item',        full: 'Which single ingredient are we wasting the most of?' },
    ],
  },
  {
    label: 'Stock',
    prompts: [
      { short: 'What to reorder', full: 'Which ingredients need reordering?' },
      { short: 'Low on stock',    full: 'What am I running low on right now?' },
    ],
  },
  {
    label: 'Recipes',
    prompts: [
      { short: 'Worst food-cost %', full: 'Which recipes have the worst food-cost %?' },
      { short: 'Best margins',      full: 'Which menu items have the best margins?' },
    ],
  },
  {
    label: 'Sales',
    prompts: [
      { short: 'Top sellers, 7 days', full: 'What were the top sellers in the last 7 days?' },
      { short: 'Recent orders',       full: 'Show me the most recent orders.' },
    ],
  },
];
