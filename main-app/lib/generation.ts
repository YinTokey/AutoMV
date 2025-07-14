import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { CONFIG } from './config';
import { sendLog, sendError, sendVideoUrl } from './stream';
import { ensureDirectories, cleanup } from './utils';
import { optimizePrompt, generateScenes } from './openai';
import { generateImagesConcurrently } from './runware';
import { generateMusicConcurrently } from './suno';
import { createVideo } from './ffmpeg';
import fs from 'fs/promises';

export async function runGeneration(initialPrompt: string, sceneCount: number, instrumental: boolean, characterImageFile: File | null) {
  try {
    await ensureDirectories();
    const optimizedPrompt = await optimizePrompt(initialPrompt);
    
    let characterImageDataURI: string | null = null;
    if (characterImageFile) {
        const imageBuffer = Buffer.from(await characterImageFile.arrayBuffer());
        characterImageDataURI = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        sendLog(`🧑 Character image prepared as data URI.`);
    }

    const scenes = await generateScenes(optimizedPrompt, sceneCount);
    const imagePaths = await generateImagesConcurrently(scenes, characterImageDataURI);
    const audioPaths = await generateMusicConcurrently(scenes, instrumental);

    // Ensure we have content to proceed
    if (imagePaths.length === 0 || audioPaths.length === 0) {
      throw new Error('No images or audio generated for the video.');
    }

    const videoUrl = await createVideo(scenes, imagePaths, audioPaths);
    sendVideoUrl(videoUrl);
    await cleanup();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendError(message);
  }
} 