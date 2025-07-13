"use client";

import React from 'react';

interface StatusLogProps {
  logs: string[];
}

export default function StatusLog({ logs }: StatusLogProps) {
  return (
    <div className="h-64 bg-gray-100 rounded-lg p-4 overflow-y-auto font-mono text-sm text-gray-600 shadow-inner">
      <p className='text-gray-800 font-bold mb-2'>Generation Progress:</p>
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap">{`> ${log}`}</div>
      ))}
    </div>
  );
}
