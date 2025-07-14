"use client";

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string | null;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  return (
    <div className="h-full min-h-[400px] flex items-center justify-center">
      {videoUrl ? (
        <div className="w-full max-w-4xl">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full h-auto max-h-[70vh] rounded-2xl"
              style={{ aspectRatio: '16/9' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-500 max-w-md mx-auto">
          <div className="w-32 h-32 glass-card rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-slate-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M15 10l4.55a1 1 0 011.45.89V15.1a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          <p className="text-slate-600">
            Your video will appear here
          </p>
        </div>
      )}
    </div>
  );
}
