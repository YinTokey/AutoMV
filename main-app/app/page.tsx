"use client";

import { useState } from 'react';
import ControlPanel from './components/ControlPanel';
import VideoPlayer from './components/VideoPlayer';
import StatusLog from './components/StatusLog';

export default function Home() {
  const [prompt, setPrompt] = useState('A vibrant, futuristic city at night, glowing with neon lights');
  const [sceneCount, setSceneCount] = useState(1);
  const [instrumental, setInstrumental] = useState(false);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setLogs(['🚀 Starting video generation...']);
    setVideoUrl(null);

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('sceneCount', sceneCount.toString());
    formData.append('instrumental', instrumental.toString());
    if (characterImage) {
      formData.append('characterImage', characterImage);
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data.startsWith('{')) {
            try {
              const event = JSON.parse(data);
              if (event.log) {
                setLogs(prev => [...prev, event.log]);
              }
              if (event.videoUrl) {
                setVideoUrl(event.videoUrl);
                setLogs(prev => [...prev, `✅ Video ready: ${event.videoUrl}`]);
                setIsGenerating(false);
              }
              if (event.error) {
                setLogs(prev => [...prev, `❌ Error: ${event.error}`]);
                setIsGenerating(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen animated-bg p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-4 float">
          Auto-MV Creator
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 font-light">
          Transform your ideas into stunning music videos with AI
        </p>
        <div className="mt-4 h-1 w-24 bg-gradient-to-r from-cyan-400 to-teal-400 mx-auto rounded-full"></div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        {/* Left Panel - Controls */}
        <div className="lg:w-1/3 min-w-0">
          <div className="glass-card p-6 h-full">
            <ControlPanel
              prompt={prompt}
              setPrompt={setPrompt}
              sceneCount={sceneCount}
              setSceneCount={setSceneCount}
              instrumental={instrumental}
              setInstrumental={setInstrumental}
              characterImage={characterImage}
              setCharacterImage={setCharacterImage}
              handleGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Right Panel - Video and Logs */}
        <div className="lg:w-2/3 flex flex-col gap-6">
          {/* Video Player */}
          <div className="glass-card p-6 flex-grow">
            <VideoPlayer videoUrl={videoUrl} />
          </div>

          {/* Status Log */}
          <div className="glass-card p-6">
            <StatusLog logs={logs} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center mt-12 text-slate-500">
        <p className="text-sm">
          Powered by AI • Create • Inspire • Share
        </p>
      </footer>
    </div>
  );
} 