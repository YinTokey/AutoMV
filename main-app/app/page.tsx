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
    <main className="flex h-screen bg-gray-100">
      <div className="w-1/3 max-w-md flex flex-col">
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