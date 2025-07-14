import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config';
import { sendLog } from './stream';

const execAsync = promisify(exec);

export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Could not get duration for ${filePath}: ${message}. Defaulting to 5s.`);
    return 5.0; // Default duration
  }
}

export async function createVideo(scenes: { music_prompt: string, style: string, title: string }[], imagePaths: string[], audioPaths: string[]): Promise<string> {
  sendLog('🎬 Creating final video with FFmpeg...');
  const videoFileName = `music_video_${Date.now()}.mp4`;
  const outputPath = path.join(CONFIG.OUTPUT_DIR, videoFileName);

  const sceneVideoPaths: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const sceneVideoPath = path.join(CONFIG.TEMP_DIR, `scene_${i + 1}_video.mp4`);
    const audioDuration = await getAudioDuration(audioPaths[i]);
    
    const effects = `fade=t=in:st=0:d=1:enable='between(t,0,10)',eq=saturation=1.2:contrast=1.05:enable='between(t,0,10)'`;

    const cmd = `ffmpeg -loop 1 -i "${imagePaths[i]}" -i "${audioPaths[i]}" -vf "${effects},scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -c:v libx264 -c:a aac -shortest -y "${sceneVideoPath}"`;

    sendLog(`🎬 Creating scene ${i + 1} video (${audioDuration.toFixed(2)}s)...`);
    try {
      await execAsync(cmd);
      sceneVideoPaths.push(sceneVideoPath);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      sendLog(`❌ FFmpeg error for scene ${i + 1}: ${message}`);
      // For now, we'll just log and continue, skipping the failed scene.
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