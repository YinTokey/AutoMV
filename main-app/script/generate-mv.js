#!/usr/bin/env node

/**
 * Auto-MV Local Script with Concurrency Support
 * 
 * Generates music videos using AI APIs with concurrent processing:
 * - Up to 10 concurrent image generations (Runware API)
 * - Up to 10 concurrent music generations (Suno API)  
 * - Intelligent batching to avoid API rate limits
 * - Perfect audio-video synchronization with FFmpeg
 * 
 * Usage: node script/generate-mv.js "concept" [scene_count]
 * Example: node script/generate-mv.js "ocean waves" 5
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  VERCEL_URL: process.env.VERCEL_URL || 'https://your-app-name.vercel.app',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RUNWARE_API_KEY: process.env.RUNWARE_API_KEY,
  SUNO_API_KEY: process.env.SUNO_API_KEY,
  SUNO_API_BASE_URL: process.env.SUNO_API_BASE_URL || 'https://apibox.erweima.ai',
  OUTPUT_DIR: './output',
  TEMP_DIR: './temp',
  MAX_POLL_ATTEMPTS: 60, // 5 minutes at 5-second intervals
  POLL_INTERVAL: 5000, // 5 seconds
  // Concurrency settings
  MAX_CONCURRENT_IMAGES: 10, // Max concurrent image generation
  MAX_CONCURRENT_MUSIC: 10,  // Max concurrent music generation
  IMAGE_BATCH_DELAY: 500,    // Delay between image batches (ms)
  MUSIC_BATCH_DELAY: 1000    // Delay between music batches (ms)
};

// Create necessary directories
async function ensureDirectories() {
  console.log('📁 Creating directories...');
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
  console.log('📁 Directories ready');
}

// Download file from URL using axios
async function downloadFile(url, filepath) {
  console.log(`📥 Downloading: ${url}`);
  
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });
    
    const writer = createWriteStream(filepath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`📥 Downloaded: ${filepath}`);
        resolve(filepath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download ${url}: ${error.message}`);
  }
}

// Make HTTP request using axios
async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.body ? JSON.parse(options.body) : undefined,
      ...options
    });
    
    return response.data;
  } catch (error) {
    const status = error.response?.status || 'Unknown';
    const message = error.response?.data || error.message;
    throw new Error(`HTTP ${status}: ${JSON.stringify(message)}`);
  }
}

// Generate scenes using OpenAI
async function generateScenes(prompt, sceneCount) {
  console.log('🎬 Generating scenes with OpenAI...');
  
  if (!CONFIG.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert music video director and cinematographer. Create detailed scene breakdowns for music videos that will be used to generate images and music.

Return a JSON object with this exact structure:
{
  "scenes": [
    {
      "scene_number": 1,
      "image_prompt": "detailed visual description for image generation",
      "music_prompt": "detailed music style and mood description"
    }
  ]
}`
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
  console.log(`🎬 Raw OpenAI response: ${content}`);
  
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error.message}. Content: ${content}`);
  }
  
  if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
    throw new Error(`Invalid scenes format in OpenAI response: ${JSON.stringify(parsedResponse)}`);
  }
  
  const scenes = parsedResponse.scenes;
  console.log(`🎬 Generated ${scenes.length} scenes`);
  
  // Debug each scene
  scenes.forEach((scene, index) => {
    console.log(`🎬 Scene ${index + 1}:`);
    console.log(`   - Image prompt: "${scene.image_prompt || 'MISSING'}"`);
    console.log(`   - Music prompt: "${scene.music_prompt || 'MISSING'}"`);
  });
  
  return scenes;
}

// Generate image using Runware
async function generateImage(prompt, sceneNumber) {
  console.log(`🖼️  Generating image for scene ${sceneNumber}...`);
  
  if (!CONFIG.RUNWARE_API_KEY) {
    throw new Error('RUNWARE_API_KEY not configured');
  }
  
  console.log(`🖼️  Image prompt: "${prompt}"`);
  
  if (!prompt || prompt.trim() === '') {
    throw new Error(`Empty image prompt for scene ${sceneNumber}`);
  }
  
  const response = await makeRequest('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.RUNWARE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      taskType: "imageInference",
      taskUUID: uuidv4(),
      positivePrompt: prompt,
      model: "runware:101@1",
      width: 1024,
      height: 576,
      numberResults: 1
    }])
  });
  
  // The response is an array of tasks
  const task = response.data[0];
  if (!task || !task.imageURL) {
    throw new Error(`No image URL in response: ${JSON.stringify(response)}`);
  }
  
  const imageUrl = task.imageURL;
  const imagePath = path.join(CONFIG.TEMP_DIR, `scene_${sceneNumber}_image.jpg`);
  
  await downloadFile(imageUrl, imagePath);
  
  console.log(`🖼️  Scene ${sceneNumber} image ready: ${imagePath}`);
  return imagePath;
}

// Generate images concurrently with max concurrency limit
async function generateImagesConcurrently(scenes) {
  const imagePaths = [];
  
  // Process scenes in batches of MAX_CONCURRENT_IMAGES
  for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_IMAGES) {
    const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_IMAGES);
    console.log(`🖼️  Starting batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_IMAGES) + 1}: scenes ${i + 1}-${Math.min(i + batch.length, scenes.length)}`);
    
    const batchPromises = batch.map(async (scene, batchIndex) => {
      const sceneNumber = i + batchIndex + 1;
      try {
        const imagePath = await generateImage(scene.image_prompt, sceneNumber);
        return imagePath;
      } catch (error) {
        console.error(`❌ Failed to generate image for scene ${sceneNumber}:`, error.message);
        throw error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    imagePaths.push(...batchResults);
    
    console.log(`✅ Batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_IMAGES) + 1} images generated`);
    
    // Small delay between batches to avoid overwhelming the API
    if (i + CONFIG.MAX_CONCURRENT_IMAGES < scenes.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.IMAGE_BATCH_DELAY));
    }
  }
  
  console.log(`🖼️  All ${scenes.length} images generated successfully!`);
  return imagePaths;
}

// Generate music directly via Suno API (callback goes to Vercel)
async function generateMusic(prompt, sceneNumber) {
  console.log(`🎵 Starting music generation for scene ${sceneNumber}...`);
  
  if (!CONFIG.SUNO_API_KEY) {
    throw new Error('SUNO_API_KEY not configured');
  }
  
  // Use Vercel URL as callback URL so Suno calls back to Vercel
  const callbackUrl = `${CONFIG.VERCEL_URL}/api/music-callback`;
  
  // Determine style based on prompt content
  const style = extractStyleFromPrompt(prompt);
  
  // Prepare the music generation request
  const generateRequest = {
    prompt: prompt,
    style: style,
    title: `Generated Music Scene ${sceneNumber}`,
    customMode: true,
    instrumental: false, // Generate with vocals unless specified
    model: "V3_5",
    negativeTags: "Heavy Metal, Aggressive, Harsh", // Avoid overly aggressive content
    callBackUrl: callbackUrl
  };
  
  console.log(`🎵 Calling Suno API directly with callback URL: ${callbackUrl}`);
  
  const response = await makeRequest(`${CONFIG.SUNO_API_BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.SUNO_API_KEY}`
    },
    body: JSON.stringify(generateRequest)
  });
  
  // Parse the task ID from Suno response
  let taskId;
  if (response.task_id) {
    taskId = response.task_id;
  } else if (response.id) {
    taskId = response.id;
  } else if (response.data?.taskId) {
    taskId = response.data.taskId;
  } else if (response.data?.task_id) {
    taskId = response.data.task_id;
  } else if (response.data?.id) {
    taskId = response.data.id;
  } else if (response.taskId) {
    taskId = response.taskId;
  } else {
    throw new Error(`No task ID found in Suno API response: ${JSON.stringify(response)}`);
  }
  
  console.log(`🎵 Music generation started for scene ${sceneNumber}, task ID: ${taskId}`);
  
  // Store task in Vercel's Supabase database
  try {
    await makeRequest(`${CONFIG.VERCEL_URL}/api/music-status/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        prompt: prompt,
        duration: 30,
        status: 'pending'
      })
    });
    console.log(`🎵 Task ${taskId} stored in Vercel database`);
  } catch (error) {
    console.warn(`⚠️  Failed to store task in Vercel database: ${error.message}`);
    // Continue anyway - polling will still work
  }
  
  return taskId;
}

// Extract style from prompt for Suno API
function extractStyleFromPrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes("classical") || lowerPrompt.includes("piano") || lowerPrompt.includes("orchestral")) {
    return "Classical";
  } else if (lowerPrompt.includes("electronic") || lowerPrompt.includes("synth") || lowerPrompt.includes("techno")) {
    return "Electronic";
  } else if (lowerPrompt.includes("rock") || lowerPrompt.includes("guitar")) {
    return "Rock";
  } else if (lowerPrompt.includes("jazz") || lowerPrompt.includes("saxophone")) {
    return "Jazz";
  } else if (lowerPrompt.includes("ambient") || lowerPrompt.includes("atmospheric")) {
    return "Ambient";
  } else if (lowerPrompt.includes("pop") || lowerPrompt.includes("catchy")) {
    return "Pop";
  } else {
    return "Electronic"; // Default to electronic for music videos
  }
}

// Generate music concurrently with max concurrency limit
async function generateMusicConcurrently(scenes) {
  const musicTasks = [];
  
  // Process scenes in batches of MAX_CONCURRENT_MUSIC
  for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_MUSIC) {
    const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_MUSIC);
    console.log(`🎵 Starting batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_MUSIC) + 1}: scenes ${i + 1}-${Math.min(i + batch.length, scenes.length)}`);
    
    const batchPromises = batch.map(async (scene, batchIndex) => {
      const sceneNumber = i + batchIndex + 1;
      try {
        const taskId = await generateMusic(scene.music_prompt, sceneNumber);
        return { taskId, sceneNumber, prompt: scene.music_prompt };
      } catch (error) {
        console.error(`❌ Failed to start music generation for scene ${sceneNumber}:`, error.message);
        throw error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    musicTasks.push(...batchResults);
    
    console.log(`✅ Batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_MUSIC) + 1} music generation started`);
    
    // Small delay between batches to avoid overwhelming the API
    if (i + CONFIG.MAX_CONCURRENT_MUSIC < scenes.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.MUSIC_BATCH_DELAY));
    }
  }
  
  console.log(`🎵 All ${scenes.length} music generation tasks started`);
  return musicTasks;
}

// Poll for music completion concurrently
async function pollMusicCompletionConcurrently(musicTasks) {
  console.log(`⏳ Polling for ${musicTasks.length} music tasks...`);
  
  const pollPromises = musicTasks.map(async (task) => {
    try {
      const audioPath = await pollMusicCompletion(task.taskId, task.sceneNumber);
      console.log(`✅ Scene ${task.sceneNumber} music ready: ${audioPath}`);
      return audioPath;
    } catch (error) {
      console.error(`❌ Scene ${task.sceneNumber} music failed:`, error.message);
      throw error;
    }
  });
  
  // Wait for all music to complete
  const audioPaths = await Promise.all(pollPromises);
  console.log(`🎵 All ${musicTasks.length} music tracks completed successfully!`);
  
  return audioPaths;
}

// Poll Vercel for music completion
async function pollMusicCompletion(taskId, sceneNumber) {
  console.log(`⏳ Polling for music completion (scene ${sceneNumber}, task: ${taskId})...`);
  
  for (let attempt = 1; attempt <= CONFIG.MAX_POLL_ATTEMPTS; attempt++) {
    try {
      // Query the Supabase-backed endpoint for task status
      const response = await makeRequest(`${CONFIG.VERCEL_URL}/api/music-status/${taskId}`);
      
      console.log(`⏳ Attempt ${attempt}: Status = ${response.status}`);
      
      if (response.status === 'completed' && response.audio_url) {
        console.log(`✅ Music completed for scene ${sceneNumber}!`);
        
        // Download the audio file
        const audioPath = path.join(CONFIG.TEMP_DIR, `scene_${sceneNumber}_audio.mp3`);
        await downloadFile(response.audio_url, audioPath);
        
        return audioPath;
      } else if (response.status === 'failed') {
        throw new Error(`Music generation failed for scene ${sceneNumber}: ${response.error_message}`);
      }
      
      // Wait before next poll
      if (attempt < CONFIG.MAX_POLL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
      }
      
    } catch (error) {
      console.log(`⚠️  Poll attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.MAX_POLL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Music generation timeout for scene ${sceneNumber} after ${CONFIG.MAX_POLL_ATTEMPTS} attempts`);
}

// Create video using local FFmpeg
async function createVideo(scenes, imagePaths, audioPaths) {
  console.log('🎬 Creating final video with FFmpeg...');
  
  // Check if FFmpeg is available
  try {
    await execAsync('ffmpeg -version');
    console.log('🎬 FFmpeg is available');
  } catch {
    throw new Error('FFmpeg not found. Please install FFmpeg and ensure it\'s in your PATH.');
  }
  
  const outputPath = path.join(CONFIG.OUTPUT_DIR, `music_video_${Date.now()}.mp4`);
  
  if (scenes.length === 1) {
    // Simple case: 1 image + 1 audio = duration matches audio exactly
    console.log('🎬 Single scene: Creating video with exact audio duration');
    
    const ffmpegCommand = [
      'ffmpeg',
      '-loop', '1',
      '-i', `"${imagePaths[0]}"`,
      '-i', `"${audioPaths[0]}"`,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-vf', '"scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2"',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-y',
      `"${outputPath}"`
    ].join(' ');
    
    console.log('🎬 FFmpeg command:', ffmpegCommand);
    const { stderr } = await execAsync(ffmpegCommand);
    
    if (stderr) console.log('🎬 FFmpeg stderr:', stderr);
    console.log('🎬 Single scene video created successfully!');
    
  } else {
    // Multiple scenes: concatenate videos
    console.log('🎬 Multiple scenes: Creating concatenated video');
    
    // Create individual scene videos
    for (let i = 0; i < scenes.length; i++) {
      const sceneVideoPath = path.join(CONFIG.TEMP_DIR, `scene_${i + 1}_video.mp4`);
      
      const sceneCommand = [
        'ffmpeg',
        '-loop', '1',
        '-i', `"${imagePaths[i]}"`,
        '-i', `"${audioPaths[i]}"`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-vf', '"scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2"',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-y',
        `"${sceneVideoPath}"`
      ].join(' ');
      
      console.log(`🎬 Creating scene ${i + 1} video...`);
      await execAsync(sceneCommand);
    }
    
    // Create concat file
    const concatFilePath = path.join(CONFIG.TEMP_DIR, 'concat.txt');
    let concatContent = '';
    for (let i = 0; i < scenes.length; i++) {
      concatContent += `file 'scene_${i + 1}_video.mp4'\n`;
    }
    await fs.writeFile(concatFilePath, concatContent);
    
    // Concatenate all scene videos
    const concatCommand = [
      'ffmpeg',
      '-f', 'concat',
      '-safe', '0',
      '-i', `"${concatFilePath}"`,
      '-c', 'copy',
      '-y',
      `"${outputPath}"`
    ].join(' ');
    
    console.log('🎬 Concatenating final video...');
    await execAsync(concatCommand);
    console.log('🎬 Multi-scene video created successfully!');
  }
  
  // Get video info
  const { stdout: videoInfo } = await execAsync(`ffprobe -v quiet -print_format json -show_format "${outputPath}"`);
  const info = JSON.parse(videoInfo);
  const duration = parseFloat(info.format.duration);
  
  console.log(`🎬 Final video created: ${outputPath}`);
  console.log(`🎬 Duration: ${Math.round(duration)}s`);
  console.log(`🎬 Size: ${(parseInt(info.format.size) / 1024 / 1024).toFixed(1)}MB`);
  
  return outputPath;
}

// Cleanup temporary files
async function cleanup() {
  console.log('🧹 Cleaning up temporary files...');
  try {
    const files = await fs.readdir(CONFIG.TEMP_DIR);
    for (const file of files) {
      await fs.unlink(path.join(CONFIG.TEMP_DIR, file));
    }
    console.log('🧹 Cleanup complete');
  } catch (error) {
    console.log('🧹 Cleanup failed:', error.message);
  }
}

// Main workflow
async function main() {
  console.log('🚀 Starting Auto-MV Local Script\n');
  
  // Get user input from command line arguments
  const args = process.argv.slice(2);
  const prompt = args[0] || "A vibrant, futuristic city at night, glowing with neon lights and skyscrapers in the background. In the foreground, a stylish young couple rides in a convertible with the top down. The woman has bright blue hair blowing in the wind, wears trendy sunglasses, layered necklaces, and a ripped tank top. The man, also in sunglasses, sports a confident smile and a sleek leather jacket. Both look exhilarated, enjoying the energy of the city. Rain gently falls, reflecting colorful lights on the wet streets, enhancing the cyberpunk vibe. The overall mood is youthful, adventurous, and electric, with dynamic lighting and a cinematic atmosphere.";
  const sceneCount = parseInt(args[1]) || 1; // Default to 3 scenes for testing concurrency
  
  if (!prompt) {
    console.log('Usage: node script/generate-mv.js "your music video concept" [scene_count]');
    console.log('Example: node script/generate-mv.js "A dreamy synthwave journey through neon-lit cityscapes" 3');
    process.exit(1);
  }
  
  console.log(`📝 Concept: ${prompt}`);
  console.log(`🎬 Scenes: ${sceneCount}`);
  console.log(`⚡ Concurrency: ${CONFIG.MAX_CONCURRENT_IMAGES} images, ${CONFIG.MAX_CONCURRENT_MUSIC} music\n`);
  
  try {
    // Track performance
    const startTime = Date.now();
    
    // Setup
    await ensureDirectories();
    
    // Generate scenes
    const scenes = await generateScenes(prompt, sceneCount);
    console.log('✅ Scenes generated\n');
    
    // Generate images concurrently
    console.log('🖼️  Generating images...');
    const imagePaths = await generateImagesConcurrently(scenes);
    console.log('✅ All images generated\n');
    
    // Generate music with concurrency (max 10 at a time)
    console.log('🎵 Generating music...');
    const musicTasks = await generateMusicConcurrently(scenes);
    
    // Poll for music completion concurrently
    console.log('⏳ Waiting for all music to complete...');
    const audioPaths = await pollMusicCompletionConcurrently(musicTasks);
    console.log('✅ All music generated\n');
    
    // Create final video
    const videoPath = await createVideo(scenes, imagePaths, audioPaths);
    console.log('✅ Video assembly complete\n');
    
    // Cleanup
    await cleanup();
    
    // Performance summary
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const avgTimePerScene = Math.round(totalTime / sceneCount);
    
    console.log('🎉 SUCCESS! Your music video is ready:');
    console.log(`📁 ${videoPath}`);
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s (avg ${avgTimePerScene}s per scene)`);
    console.log(`⚡ Concurrency saved significant time with ${sceneCount} scenes!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main(); 