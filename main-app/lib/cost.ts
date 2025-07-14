import { sendCost } from './stream';

type CostCategory = 'OpenAI' | 'Runware' | 'Suno';

interface Cost {
  category: CostCategory;
  details: string;
  amount: number;
}

let totalCost = 0;
const recordedCosts: Cost[] = [];

// Pricing per million tokens
const OPENAI_PRICING = {
  'gpt-4o': {
    input: 5.00,
    output: 15.00,
  },
  // Add other models here if needed
};

export function recordCost(tokens: { input: number; output: number }, model: keyof typeof OPENAI_PRICING, category: 'OpenAI'): void;
export function recordCost(amount: number, details: string, category: 'Runware' | 'Suno'): void;
export function recordCost(
  arg1: { input: number; output: number } | number,
  arg2: keyof typeof OPENAI_PRICING | string,
  arg3: CostCategory
): void {
  let cost: Cost;

  if (arg3 === 'OpenAI' && typeof arg1 === 'object' && arg2 in OPENAI_PRICING) {
    const modelKey = arg2 as keyof typeof OPENAI_PRICING;
    const pricing = OPENAI_PRICING[modelKey];
    const inputCost = (arg1.input / 1_000_000) * pricing.input;
    const outputCost = (arg1.output / 1_000_000) * pricing.output;
    const amount = inputCost + outputCost;

    cost = {
      category: 'OpenAI',
      details: `Model: ${modelKey}, Tokens: ${arg1.input} in / ${arg1.output} out`,
      amount,
    };
  } else if ((arg3 === 'Runware' || arg3 === 'Suno') && typeof arg1 === 'number' && typeof arg2 === 'string') {
    cost = {
      category: arg3,
      details: arg2,
      amount: arg1,
    };
  } else {
    // This case should ideally not be reached with proper function overloading
    console.error('Invalid arguments passed to recordCost');
    return;
  }
  
  recordedCosts.push(cost);
  totalCost += cost.amount;
  
  const costData = {
    ...cost,
    totalCost
  };
  
  sendCost(costData);
}

export function getCosts() {
  return {
    costs: recordedCosts,
    total: totalCost,
  };
}

export function resetCosts() {
  totalCost = 0;
  recordedCosts.length = 0;
} 