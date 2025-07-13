"use client";

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = async () => {
    // Placeholder for API call logic
    console.log("Generating MV for prompt:", prompt);
    // Here you would typically make an API call to your backend
    // e.g., await fetch('/api/generate', { method: 'POST', body: JSON.stringify({ prompt }) });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Auto-MV
          </h1>
          <p className="text-gray-600 mt-2">AI-Powered Music Video Creator</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">✨ Create Your Music Video</h2>
          
          <p className="text-gray-700 mb-6">
            Enter a prompt for the music you want to create. Our AI will generate the music and then create a stunning music video to match.
          </p>

          <div className="space-y-4">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              rows={4}
              placeholder="e.g., A dreamy synthwave journey through a neon-lit cyberpunk city"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              Generate Music Video
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              <strong>🎯 Perfect for your use case:</strong> 1 image + 2-minute audio = 2-minute video with exact duration matching!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 