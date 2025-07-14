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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold gradient-text mb-2">Create Your Vision</h2>
        <p className="text-slate-600 text-sm">Describe your dream music video</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Video Concept */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="text-xl">🎨</span>
            Video Concept
          </label>
          <textarea
            id="prompt"
            className="glass-input w-full p-4 text-slate-800 placeholder-slate-500 resize-none"
            rows={5}
            placeholder="e.g., A dreamy synthwave journey through a neon-lit cyberpunk city with floating islands and holographic butterflies..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        {/* Scene Count */}
        <div>
          <label htmlFor="sceneCount" className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="text-xl">🎬</span>
            Number of Scenes
          </label>
          <div className="relative">
            <input
              type="number"
              id="sceneCount"
              className="glass-input w-full p-4 text-slate-800 pr-16"
              value={sceneCount}
              onChange={(e) => setSceneCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="10"
              disabled={isGenerating}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-medium">
              scenes
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            More scenes = longer video (1-10 recommended)
          </div>
        </div>

        {/* Instrumental Toggle */}
        <div className="glass-input p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎵</span>
              <div>
                <label htmlFor="instrumental" className="text-sm font-semibold text-slate-800 block">
                  Instrumental Music
                </label>
                <p className="text-xs text-slate-600">Generate music without vocals</p>
              </div>
            </div>
            <div className="relative">
              <input
                id="instrumental"
                type="checkbox"
                className="sr-only"
                checked={instrumental}
                onChange={(e) => setInstrumental(e.target.checked)}
                disabled={isGenerating}
              />
              <div
                className={`w-12 h-6 rounded-full transition-all cursor-pointer ${
                  instrumental 
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500' 
                    : 'bg-slate-300'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isGenerating && setInstrumental(!instrumental)}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                    instrumental ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Character Reference */}
        <div>
          <label htmlFor="characterImage" className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="text-xl">👤</span>
            Character Reference
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full">Optional</span>
          </label>
          
          <div className="glass-input p-4">
            <input
              id="characterImage"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCharacterImage(e.target.files ? e.target.files[0] : null)}
              disabled={isGenerating}
            />
            
            {characterImage ? (
              <div className="flex items-center gap-4">
                <img 
                  src={URL.createObjectURL(characterImage)} 
                  alt="Character preview" 
                  className="w-16 h-16 rounded-xl object-cover shadow-md" 
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{characterImage.name}</p>
                  <p className="text-xs text-slate-600">Character reference uploaded</p>
                </div>
                <button
                  onClick={() => setCharacterImage(null)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  disabled={isGenerating}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label 
                htmlFor="characterImage" 
                className={`flex flex-col items-center justify-center py-8 border-2 border-dashed border-cyan-300 rounded-xl cursor-pointer hover:border-cyan-400 transition-colors ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg className="w-10 h-10 text-cyan-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm text-slate-600 text-center">
                  <span className="font-medium">Click to upload</span> character image
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt || isGenerating}
        className={`glass-button w-full py-4 px-6 text-lg font-bold transition-all ${
          isGenerating ? 'pulse-glow' : ''
        }`}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Creating Magic...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl">✨</span>
            <span>Generate Video</span>
          </div>
        )}
      </button>

      {/* Tips */}
      <div className="glass-input p-4 bg-cyan-50/80">
        <h4 className="text-sm font-semibold text-cyan-800 mb-2 flex items-center gap-2">
          <span className="text-base">💡</span>
          Pro Tips
        </h4>
        <ul className="text-xs text-cyan-700 space-y-1">
          <li>• Be descriptive about mood, setting, and visual style</li>
          <li>• Mention specific colors, lighting, or atmosphere</li>
          <li>• Include artistic styles (anime, photorealistic, abstract)</li>
          <li>• Character images help maintain consistency across scenes</li>
        </ul>
      </div>
    </div>
  );
}
