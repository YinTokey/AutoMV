"use client";

import React from 'react';
import { motion } from 'framer-motion';

const loadingContainerVariants = {
  start: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  end: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const loadingCircleVariants = {
  start: {
    y: '0%',
  },
  end: {
    y: '100%',
  },
};

const loadingCircleTransition = {
  duration: 0.4,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
};

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center text-slate-500">
      <motion.div
        className="flex justify-around w-24 h-12"
        variants={loadingContainerVariants}
        initial="start"
        animate="end"
      >
        <motion.span className="block w-4 h-4 bg-cyan-400 rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
        <motion.span className="block w-4 h-4 bg-teal-400 rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
        <motion.span className="block w-4 h-4 bg-blue-400 rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
        <motion.span className="block w-4 h-4 bg-teal-400 rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
        <motion.span className="block w-4 h-4 bg-cyan-400 rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
      </motion.div>
      <p className="text-slate-600 mt-8 tracking-widest animate-pulse">
        CREATING YOUR MASTERPIECE...
      </p>
    </div>
  );
};

export default LoadingSpinner; 