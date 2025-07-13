"use client";

import { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import VideoPlayer from './components/VideoPlayer';
import StatusLog from './components/StatusLog';

export default function Home() {
  const [prompt, setPrompt] = useState('A vibrant, futuristic city at night, glowing with neon lights');
  const [sceneCount, setSceneCount] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setLogs(['🚀 Starting video generation...']);
    setVideoUrl(null);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sceneCount }),
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
    <main className="flex h-screen bg-gray-100">
      <div className="w-1/3 max-w-md flex flex-col">
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          sceneCount={sceneCount}
          setSceneCount={setSceneCount}
          handleGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        <div className="p-6 flex-grow">
          <StatusLog logs={logs} />
        </div>
      </div>
      <div className="w-2/3 flex-grow">
        <VideoPlayer videoUrl={videoUrl} />
      </div>
    </main>
  );
} 