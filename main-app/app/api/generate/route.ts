import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  VERCEL_URL: process.env.VERCEL_URL || 'http://localhost:3000',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RUNWARE_API_KEY: process.env.RUNWARE_API_KEY,
  SUNO_API_KEY: process.env.SUNO_API_KEY,
  SUNO_API_BASE_URL: process.env.SUNO_API_BASE_URL || 'https://apibox.erweima.ai',
  OUTPUT_DIR: path.join(process.cwd(), 'public/output'),
  TEMP_DIR: path.join(process.cwd(), 'temp'),
  MAX_POLL_ATTEMPTS: 120, // 10 minutes at 5-second intervals
  POLL_INTERVAL: 5000, // 5 seconds
  MAX_CONCURRENT_IMAGES: 5,
  MAX_CONCURRENT_MUSIC: 5,
  IMAGE_BATCH_DELAY: 500,
  MUSIC_BATCH_DELAY: 1000,
};

let streamController: ReadableStreamDefaultController<any>;
// Keep a list of generated video URLs for this server instance
const generatedVideos: string[] = [];

function sendLog(log: string) {
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ log })}\n\n`);
  }
}

function sendError(error: string) {
    if (streamController) {
      streamController.enqueue(`data: ${JSON.stringify({ error })}\n\n`);
    }
  }

function sendVideoUrl(videoUrl: string) {
  generatedVideos.push(videoUrl);
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ videoUrl, videoList: generatedVideos })}\n\n`);
  }
}

async function ensureDirectories() {
  sendLog('📁 Creating directories...');
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
  sendLog('📁 Directories ready');
}

async function downloadFile(url: string, filepath: string) {
  sendLog(`📥 Downloading: ${url.substring(0, 50)}...`);
  try {
    const response = await axios({ method: 'get', url, responseType: 'stream' });
    const writer = createWriteStream(filepath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        sendLog(`📥 Downloaded: ${path.basename(filepath)}`);
        resolve(filepath);
      });
      writer.on('error', reject);
    });
  } catch (error: any) {
    throw new Error(`Failed to download ${url}: ${error.message}`);
  }
}

async function makeRequest(url: string, options: any = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      data: options.body ? JSON.parse(options.body) : undefined,
      ...options,
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'Unknown';
    const message = error.response?.data || error.message;
    throw new Error(`HTTP ${status}: ${JSON.stringify(message)}`);
  }
}

async function optimizePrompt(prompt: string): Promise<string> {
  sendLog('🤖 Optimizing prompt...');
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative assistant. Your task is to take a user's idea for a music video and expand it into a more vivid and detailed prompt. Focus on mood, visual elements, and narrative. The output should be a single, enhanced prompt string. Do not add any extra conversational text or formatting."
        },
        {
          role: "user",
          content: `Enhance this music video concept: ${prompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  const optimizedPrompt = response.choices[0].message.content.trim();
  sendLog(`🤖 Optimized prompt: ${optimizedPrompt.substring(0, 100)}...`);
  return optimizedPrompt;
}

async function generateScenes(prompt: string, sceneCount: number) {
    sendLog('🎬 Generating scenes with OpenAI...');
    if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert music video director. Create detailed scene breakdowns. For each scene, provide an image prompt, a music prompt, a music style (e.g., 'cinematic', 'pop', 'ambient'), and a title for the music track. Return a JSON object: { "scenes": [ { "scene_number": 1, "image_prompt": "...", "music_prompt": "...", "style": "...", "title": "..." } ] }`
          },
          {
            role: "user",
            content: `Create ${sceneCount} scenes for a music video: ${prompt}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2000
      })
    });
  
    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content);
    if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
      throw new Error('Invalid scenes format from OpenAI');
    }
    sendLog(`🎬 Generated ${parsedResponse.scenes.length} scenes`);
    return parsedResponse.scenes;
}

const VISUAL_STYLES = [
    'cinematic, 8k, photorealistic, high detail, vibrant colors',
    'anime style, key visual, cel shading, vibrant palette',
    'fantasy, epic, dramatic lighting, matte painting',
    'sci-fi, futuristic, neon lights, cyberpunk atmosphere',
    'watercolor, fluid, dreamy, pastel tones',
    'impressionistic, oil painting, thick brush strokes',
    'pixel art, 16-bit, retro game aesthetic',
    'steampunk, victorian, brass machinery, dramatic',
    'noir film, monochrome, strong shadows, moody',
    'surrealism, dali-esque, melting landscapes',
    'minimalist, flat design, bold shapes',
    'vaporwave, 90s retro, gridlines, pink and cyan',
    'glitch art, distorted, RGB shift, futuristic',
    'comic book, halftone, bold outlines',
    'fantasy watercolor, luminous, ethereal glow'
];

async function generateImage(prompt: string, sceneNumber: number, characterImagePath: string | null, retryCount = 0) {
    sendLog(`🖼️ Generating image for scene ${sceneNumber}...`);
    if (!CONFIG.RUNWARE_API_KEY) throw new Error('RUNWARE_API_KEY not configured');

    if (!prompt || prompt.trim() === '') {
        if (retryCount < 3) {
            sendLog(`⚠️ Empty image prompt for scene ${sceneNumber}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // We can't really get a new prompt here without more context,
            // so we'll just log it and hope other scenes are okay.
            // In a real scenario, we might want to call OpenAI again for just this scene.
            throw new Error(`Persistent empty image prompt for scene ${sceneNumber}`);
        } else {
            throw new Error(`Empty image prompt for scene ${sceneNumber}`);
        }
    }

    const randomStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
        let enhancedPrompt = `${prompt}, ${randomStyle}`;
    if (characterImagePath) {
      // Note: This is a simplified way to reference the character.
      // A more advanced implementation might use image-to-image models or specific prompt techniques.
      enhancedPrompt = `A character that looks like the reference image is in this scene: ${prompt}, ${randomStyle}`;
      sendLog(`🧑 Incorporating character reference for scene ${sceneNumber}`);
    }
    const negativePrompt = 'blurry, low quality, boring, flat, ugly, simple, watermark, text';

    const response = await makeRequest('https://api.runware.ai/v1', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.RUNWARE_API_KEY}` },
      body: JSON.stringify([{
        taskType: "imageInference",
        taskUUID: uuidv4(),
        positivePrompt: enhancedPrompt,
        model: "rundiffusion:120@100",
        negativePrompt: negativePrompt,
            width: 1024,
        height: 576,
        numberResults: 1,
            sampler: "DPM++ 2M Karras",
            steps: 30,
            guidanceScale: 7
      }])
    });
  
    const task = response.data[0];
    if (!task || !task.imageURL) throw new Error(`No image URL in response: ${JSON.stringify(response)}`);
  
    const imagePath = path.join(CONFIG.TEMP_DIR, `scene_${sceneNumber}_image.jpg`);
    await downloadFile(task.imageURL, imagePath);
    sendLog(`🖼️ Scene ${sceneNumber} image ready`);
    return imagePath;
}

async function generateImagesConcurrently(scenes: any[], characterImagePath: string | null) {
    const imagePaths = [];
    for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_IMAGES) {
      const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_IMAGES);
      sendLog(`🖼️ Starting image batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_IMAGES) + 1}`);
      const batchPromises = batch.map((scene, batchIndex) => 
                generateImage(scene.image_prompt, i + batchIndex + 1, characterImagePath)
      );
      imagePaths.push(...await Promise.all(batchPromises));
      if (i + CONFIG.MAX_CONCURRENT_IMAGES < scenes.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.IMAGE_BATCH_DELAY));
      }
    }
    sendLog('🖼️ All images generated!');
    return imagePaths;
}


async function generateMusic(prompt: string, style: string, title: string, sceneNumber: number, instrumental: boolean) {
    sendLog(`🎵 Starting music generation for scene ${sceneNumber}...`);
    if (!CONFIG.SUNO_API_KEY) throw new Error('SUNO_API_KEY not configured');
  
    const response = await makeRequest(`${CONFIG.SUNO_API_BASE_URL}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.SUNO_API_KEY}` },
      body: JSON.stringify({ 
          prompt,
          style,
          title,
          customMode: true, 
          instrumental,
          model: "V3_5",
          negativeTags: "low quality, noisy, distorted, muffled",
          callBackUrl: `${CONFIG.VERCEL_URL}/api/music-callback`
      }),
    });
    
    let taskId = response.task_id || response.id || response.data?.taskId || response.data?.task_id || response.data?.id || response.taskId;
    if (!taskId) throw new Error(`No task ID in Suno response: ${JSON.stringify(response)}`);

    // Create the initial task record in the database via the webhook app
    try {
      await makeRequest(`${CONFIG.VERCEL_URL}/api/music-status/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt,
          status: 'pending'
        })
      });
      sendLog(`📝 Task ${taskId} created in database`);
    } catch (e: any) {
      sendLog(`⚠️ Could not create task in database: ${e.message}`);
      // We can still continue, but polling might be less reliable
    }
  
    sendLog(`🎵 Music task started for scene ${sceneNumber}: ${taskId}`);
    return taskId;
}

async function pollMusicCompletion(taskId: string, sceneNumber: number) {
    sendLog(`⏳ Polling music for scene ${sceneNumber}...`);
    for (let attempt = 1; attempt <= CONFIG.MAX_POLL_ATTEMPTS; attempt++) {
      const pollUrl = `${CONFIG.VERCEL_URL}/api/music-status/${taskId}`;
      try {
        sendLog(`- Attempt ${attempt}: Polling ${pollUrl}`);
        const response = await makeRequest(pollUrl, {
            headers: { 'Authorization': `Bearer ${CONFIG.SUNO_API_KEY}` },
        });
        
        if (response.status === 'completed' && response.audio_url) {
          sendLog(`✅ Music completed for scene ${sceneNumber}!`);
          const audioPath = path.join(CONFIG.TEMP_DIR, `scene_${sceneNumber}_audio.mp3`);
          await downloadFile(response.audio_url, audioPath);
          return audioPath;
        } else if (response.status === 'failed') {
          throw new Error(`Music generation failed: ${response.error_message}`);
        }
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
      } catch (error: any) {
        sendLog(`⚠️ Poll attempt ${attempt} failed: ${error.message}`);
        if (attempt >= CONFIG.MAX_POLL_ATTEMPTS) throw error;
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
      }
    }
    throw new Error(`Music generation timeout for scene ${sceneNumber}`);
}

async function generateMusicConcurrently(scenes: any[], instrumental: boolean) {
    const musicTasks = [];
    for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_MUSIC) {
        const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_MUSIC);
        sendLog(`🎵 Starting music batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_MUSIC) + 1}`);
        const batchPromises = batch.map(async (scene, batchIndex) => {
            const sceneNumber = i + batchIndex + 1;
                                    const taskId = await generateMusic(scene.music_prompt, scene.style, scene.title, sceneNumber, instrumental);
            return { taskId, sceneNumber };
        });
        musicTasks.push(...await Promise.all(batchPromises));
        if (i + CONFIG.MAX_CONCURRENT_MUSIC < scenes.length) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.MUSIC_BATCH_DELAY));
        }
    }
    
    sendLog('🎵 All music tasks started. Now polling for completion...');
    const audioPaths = await Promise.all(
        musicTasks.map(task => pollMusicCompletion(task.taskId, task.sceneNumber))
    );
    sendLog('🎵 All music tracks completed!');
    return audioPaths;
}

async function getAudioDuration(filePath: string): Promise<number> {
    try {
        const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
        const { stdout } = await execAsync(command);
        return parseFloat(stdout.trim());
    } catch (error) {
        sendLog(`⚠️ Could not get duration for ${filePath}. Defaulting to 5s.`);
        return 5.0; // Default duration
    }
}

async function createVideo(scenes: any[], imagePaths: string[], audioPaths: string[]) {
    sendLog('🎬 Creating final video with FFmpeg...');
    const videoFileName = `music_video_${Date.now()}.mp4`;
    const outputPath = path.join(CONFIG.OUTPUT_DIR, videoFileName);

    const sceneVideoPaths = [];
    for (let i = 0; i < scenes.length; i++) {
        const sceneVideoPath = path.join(CONFIG.TEMP_DIR, `scene_${i + 1}_video.mp4`);
        const audioDuration = await getAudioDuration(audioPaths[i]);
        
        // Dynamic zoom & pan with random direction/speed for diversity
        const directions = [
            "iw/2-(iw/zoom/2)",        // center
            "0",                         // left/top
            "iw-(iw/zoom)",              // right
        ];
        const randX = directions[Math.floor(Math.random() * directions.length)];
        const randY = directions[Math.floor(Math.random() * directions.length)];
        // Reduced zoom speed range to half
        // Further reduced zoom speed
        const speed = (Math.random() * 0.0004 + 0.0001).toFixed(4); // 0.0001-0.0005
        const zoomPan = `zoompan=z='min(zoom+${speed},1.15)':d=${Math.ceil(25 * audioDuration)}:x='${randX}':y='${randY}':s=1024x576`; // Max zoom 1.15 for subtle effect
        
        const fadeOutStart = (Math.max(0, audioDuration - 1)).toFixed(2);
        const cmd = `ffmpeg -loop 1 -i "${imagePaths[i]}" -i "${audioPaths[i]}" -vf "${zoomPan},fade=t=in:st=0:d=1,fade=t=out:st=${fadeOutStart}:d=1,eq=saturation=1.2:contrast=1.05,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -c:a aac -shortest -y "${sceneVideoPath}"`;
        
        sendLog(`🎬 Creating scene ${i + 1} video (${audioDuration.toFixed(2)}s)...`);
        try {
            await execAsync(cmd);
            sceneVideoPaths.push(sceneVideoPath);
        } catch (error: any) {
            sendLog(`❌ FFmpeg error for scene ${i + 1}: ${error.message}`);
            // Decide if we should skip this scene or stop the whole process
            // For now, we'll just log and continue
        }
    }

    if (sceneVideoPaths.length === 0) {
        throw new Error('No video scenes were successfully generated.');
    }

    if (sceneVideoPaths.length > 1) {
        const concatFilePath = path.join(CONFIG.TEMP_DIR, 'concat.txt');
        const concatContent = sceneVideoPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        await fs.writeFile(concatFilePath, concatContent);
        const concatCmd = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy -y "${outputPath}"`;
        sendLog('🎬 Concatenating videos...');
        await execAsync(concatCmd);
    } else {
        await fs.rename(sceneVideoPaths[0], outputPath);
    }

    sendLog('🎬 Final video created!');
    return `/output/${videoFileName}`;
}

async function cleanup() {
  sendLog('🧹 Cleaning up temporary files...');
  try {
    const files = await fs.readdir(CONFIG.TEMP_DIR);
    for (const file of files) {
      await fs.unlink(path.join(CONFIG.TEMP_DIR, file));
    }
    sendLog('🧹 Cleanup complete');
  } catch (error: any) {
    sendLog(`🧹 Cleanup failed: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const prompt = formData.get('prompt') as string;
  const sceneCount = parseInt(formData.get('sceneCount') as string, 10);
  const instrumental = formData.get('instrumental') === 'true';
  const characterImageFile = formData.get('characterImage') as File | null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      runGeneration(prompt, sceneCount, instrumental, characterImageFile)
        .catch(e => {
          sendError(e.message);
        })
        .finally(() => {
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function runGeneration(initialPrompt: string, sceneCount: number, instrumental: boolean, characterImageFile: File | null) {
    await ensureDirectories();
        const optimizedPrompt = await optimizePrompt(initialPrompt);
        let characterImagePath: string | null = null;
    if (characterImageFile) {
      const imageBuffer = Buffer.from(await characterImageFile.arrayBuffer());
      characterImagePath = path.join(CONFIG.TEMP_DIR, `char_ref_${uuidv4()}_${characterImageFile.name}`);
      await fs.writeFile(characterImagePath, imageBuffer);
      sendLog(`🧑 Character reference image saved: ${characterImageFile.name}`);
    }

    const scenes = await generateScenes(optimizedPrompt, sceneCount);
        const imagePaths = await generateImagesConcurrently(scenes, characterImagePath);
        const audioPaths = await generateMusicConcurrently(scenes, instrumental);
    const videoUrl = await createVideo(scenes, imagePaths, audioPaths);
    sendVideoUrl(videoUrl);
    await cleanup();
}
