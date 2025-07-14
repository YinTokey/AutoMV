import path from 'path';
import { CONFIG } from './config';
import { makeRequest, downloadFile } from './utils';
import { sendLog } from './stream';

export async function generateMusic(prompt: string, style: string, title: string, sceneNumber: number, instrumental: boolean): Promise<string> {
  sendLog(`🎵 Starting music generation for scene ${sceneNumber}...`);
  if (!CONFIG.SUNO_API_KEY) throw new Error('SUNO_API_KEY not configured');

  try {
    const response = await makeRequest(`${CONFIG.SUNO_API_BASE_URL}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.SUNO_API_KEY}` },
      data: { 
        prompt,
        style,
        title,
        customMode: true, 
        instrumental,
        model: "V3_5",
        negativeTags: "low quality, noisy, distorted, muffled",
        callBackUrl: `${CONFIG.VERCEL_URL}/api/music-callback`
      }
    });
    
    const taskId = response.task_id || response.id || response.data?.taskId || response.data?.task_id || response.data?.id || response.taskId;
    if (!taskId) {
      throw new Error(`No task ID in Suno response: ${JSON.stringify(response)}`);
    }

    // Create the initial task record in the database via the webhook app
    try {
      await makeRequest(`${CONFIG.VERCEL_URL}/api/music-status/${taskId}`, {
        method: 'POST',
        data: {
          prompt,
          status: 'pending'
        }
      });
      sendLog(`📝 Task ${taskId} created in database`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      sendLog(`⚠️ Could not create task in database: ${message}`);
      // We can still continue, but polling might be less reliable
    }

    sendLog(`🎵 Music task started for scene ${sceneNumber}: ${taskId}`);
    return taskId;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error starting music generation for scene ${sceneNumber}: ${message}`);
    throw new Error(`Failed to start music generation: ${message}`);
  }
}

export async function pollMusicCompletion(taskId: string, sceneNumber: number): Promise<string> {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      sendLog(`⚠️ Poll attempt ${attempt} failed: ${message}`);
      if (attempt >= CONFIG.MAX_POLL_ATTEMPTS) {
        throw new Error(`Polling failed after ${attempt} attempts: ${message}`);
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    }
  }
  throw new Error(`Music generation timeout for scene ${sceneNumber}`);
}

export async function generateMusicConcurrently(scenes: { music_prompt: string, style: string, title: string }[], instrumental: boolean): Promise<string[]> {
  const musicTasks: { taskId: string, sceneNumber: number }[] = [];
  for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_MUSIC) {
    const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_MUSIC);
    sendLog(`🎵 Starting music batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_MUSIC) + 1}`);
    const batchPromises = batch.map(async (scene, batchIndex) => {
      const sceneNumber = i + batchIndex + 1;
      const taskId = await generateMusic(scene.music_prompt, scene.style, scene.title, sceneNumber, instrumental);
      return { taskId, sceneNumber };
    });
    const resolvedTasks = await Promise.all(batchPromises);
    musicTasks.push(...resolvedTasks);
    if (i + CONFIG.MAX_CONCURRENT_MUSIC < scenes.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.MUSIC_BATCH_DELAY));
    }
  }
  
  sendLog('🎵 All music tasks started. Now polling for completion...');
  const audioPaths: string[] = await Promise.all(
    musicTasks.map(async task => {
      try {
        return await pollMusicCompletion(task.taskId, task.sceneNumber);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        sendLog(`⚠️ Music completion failed for scene ${task.sceneNumber}: ${message}`);
        return null;
      }
    })
  );
  sendLog('🎵 All music tracks completed!');
  return audioPaths.filter((p): p is string => p !== null);
} 