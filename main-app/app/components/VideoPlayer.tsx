"use client";

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string | null;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  return (
    <div className="flex-grow flex items-center justify-center bg-gray-900 p-8">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          className="max-w-full max-h-full rounded-lg shadow-2xl"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="text-center text-gray-400">
          <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1 1 0 011.45.89V15.1a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold">Your video will appear here</h3>
          <p className="text-gray-500 mt-1">Enter a prompt and click generate to start.</p>
        </div>
      )}
    </div>
  );
}
