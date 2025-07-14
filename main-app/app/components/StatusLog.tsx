"use client";

import React, { useEffect, useRef } from 'react';

interface StatusLogProps {
  logs: string[];
}

const getLogStyle = (log: string) => {
  if (log.includes('✅') || log.includes('completed') || log.includes('ready')) {
    return 'status-success';
  }
  if (log.includes('❌') || log.includes('Error') || log.includes('failed')) {
    return 'status-error';
  }
  if (log.includes('⚠️') || log.includes('Warning')) {
    return 'status-warning';
  }
  if (log.includes('🎵') || log.includes('🎨') || log.includes('🎬')) {
    return 'status-info';
  }
  return 'text-slate-700';
};

// Check if log message already starts with an emoji
const hasEmojiPrefix = (log: string): boolean => {
  // Common emoji regex pattern to detect emoji at the start
  const emojiRegex = /^[\u{1F600}-\u{1F64F}]|^[\u{1F300}-\u{1F5FF}]|^[\u{1F680}-\u{1F6FF}]|^[\u{1F1E0}-\u{1F1FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]|^[🎨🎵🎬📝⏳🚀✅❌⚠️🖼️🤖🎶🧑]/u;
  return emojiRegex.test(log.trim());
};

export default function StatusLog({ logs }: StatusLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold gradient-text flex items-center gap-2">
          <span className="text-xl">📊</span>
          Generation Progress
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span>Live Updates</span>
        </div>
      </div>

      {/* Log Container */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-cyan-200/50 overflow-hidden">
        <div className="h-64 overflow-y-auto p-4 space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-cyan-300/40 scrollbar-track-transparent">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-cyan-200 border-dashed rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📝</span>
                </div>
                <p>Waiting for generation to start...</p>
              </div>
            </div>
          ) : (
            logs.map((log, index) => {
              const style = getLogStyle(log);
              const timestamp = new Date().toLocaleTimeString();
              const hasEmoji = hasEmojiPrefix(log);
              
              return (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-cyan-50/50 transition-colors group"
                >
                  {!hasEmoji && (
                    <span className="text-lg flex-shrink-0 mt-0.5 text-slate-400">
                      •
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`${style} leading-relaxed break-words`}>
                      {log}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
        
        {/* Progress Indicator */}
        {logs.length > 0 && (
          <div className="px-4 py-3 bg-cyan-50/50 border-t border-cyan-200/50">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{logs.length} operations logged</span>
                  {logs.some(log => log.includes('Creating Magic') || log.includes('Generating')) && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status Summary */}
              <div className="flex items-center gap-2 text-xs">
                {logs.filter(log => log.includes('✅')).length > 0 && (
                  <span className="status-success">
                    {logs.filter(log => log.includes('✅')).length} completed
                  </span>
                )}
                {logs.filter(log => log.includes('❌')).length > 0 && (
                  <span className="status-error">
                    {logs.filter(log => log.includes('❌')).length} errors
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 text-xs">
        <button 
          onClick={() => navigator.clipboard.writeText(logs.join('\n'))}
          className="glass-input px-3 py-2 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Logs
        </button>
      </div>
    </div>
  );
}
