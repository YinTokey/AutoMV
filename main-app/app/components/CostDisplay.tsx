"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Cost = {
  category: 'OpenAI' | 'Runware' | 'Suno';
  details: string;
  amount: number;
};

type CostData = Cost & { totalCost: number };

interface CostDisplayProps {
  costs: CostData[];
}

const CategoryIcon = ({ category }: { category: Cost['category'] }) => {
  const iconMap = {
    OpenAI: '🤖',
    Runware: '🖼️',
    Suno: '🎵',
  };
  return <span className="mr-2 text-xl">{iconMap[category]}</span>;
};

const CostDisplay = ({ costs }: CostDisplayProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (costs.length === 0) {
    return null;
  }

  const totalCost = costs.length > 0 ? costs[costs.length - 1].totalCost : 0;

  return (
    <div className="glass-card p-4 md:p-6 mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-xl font-bold text-slate-700"
      >
        <span>Cost Breakdown</span>
        <div className="flex items-center">
          <span className="text-lg font-mono bg-slate-200 text-teal-600 rounded-md px-2 py-1 mr-4">
            Total: ${totalCost.toFixed(4)}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▶
          </motion.span>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {costs.map((cost, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex justify-between items-center p-2 rounded-md bg-slate-50/50"
                >
                  <div className="flex items-center">
                    <CategoryIcon category={cost.category} />
                    <div>
                      <p className="font-semibold">{cost.category}</p>
                      <p className="text-xs text-slate-500">{cost.details}</p>
                    </div>
                  </div>
                  <span className="font-mono text-slate-700">${cost.amount.toFixed(4)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CostDisplay; 