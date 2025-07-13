"use client";

import React from 'react';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  sceneCount: number;
  setSceneCount: (count: number) => void;
  instrumental: boolean;
  setInstrumental: (instrumental: boolean) => void;
  characterImage: File | null;
  setCharacterImage: (image: File | null) => void;
  handleGenerate: () => void;
  isGenerating: boolean;
}

export default function ControlPanel({
  prompt, setPrompt,
  sceneCount, setSceneCount,
  instrumental, setInstrumental,
  characterImage, setCharacterImage,
  handleGenerate, isGenerating
}: ControlPanelProps) {
  return (
    <div className="flex flex-col h-full p-6 bg-gray-50 border-r border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Auto-MV Creator</h2>
        <p className="text-gray-500">AI-Powered Music Video Generation</p>
      </div>

      <div className="space-y-4 flex-grow">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">Video Concept</label>
          <textarea
            id="prompt"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
            rows={6}
            placeholder="e.g., A dreamy synthwave journey through a neon-lit cyberpunk city"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label htmlFor="sceneCount" className="block text-sm font-medium text-gray-700 mb-1">Number of Scenes</label>
          <input
            type="number"
            id="sceneCount"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
            value={sceneCount}
            onChange={(e) => setSceneCount(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="10"
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="instrumental" className="text-sm font-medium text-gray-700">Instrumental Music</label>
          <input
            id="instrumental"
            type="checkbox"
            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            checked={instrumental}
            onChange={(e) => setInstrumental(e.target.checked)}
            disabled={isGenerating}
          />
        </div>

        <div>
          <label htmlFor="characterImage" className="block text-sm font-medium text-gray-700 mb-1">Character Reference (Optional)</label>
          <input
            id="characterImage"
            type="file"
            accept="image/*"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            onChange={(e) => setCharacterImage(e.target.files ? e.target.files[0] : null)}
            disabled={isGenerating}
          />
          {characterImage && (
            <div className="mt-2 text-xs text-gray-600 flex items-center">
              <img src={URL.createObjectURL(characterImage)} alt="Preview" className="h-10 w-10 rounded-md object-cover mr-2" />
              <span>{characterImage.name}</span>
            </div>
          )}
        </div>

      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt || isGenerating}
        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md transform hover:scale-105 active:scale-100"
      >
        {isGenerating ? 'Generating...' : '✨ Generate Video'}
      </button>
    </div>
  );
}
