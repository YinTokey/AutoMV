import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { CONFIG } from './config';
import { sendLog } from './stream';

export async function makeRequest(url: string, options: import('axios').AxiosRequestConfig = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      data: options.data,
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'Unknown';
      const message = error.response?.data || error.message;
      throw new Error(`HTTP ${status}: ${JSON.stringify(message)}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Request failed: ${message}`);
  }
}

export async function downloadFile(url: string, filepath: string): Promise<string> {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download ${url}: ${message}`);
  }
}

export async function ensureDirectories() {
  sendLog('📁 Creating directories...');
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
  sendLog('📁 Directories ready');
}

export async function cleanup() {
  sendLog('🧹 Cleaning up temporary files...');
  const tempDirs = [CONFIG.TEMP_DIR, path.join(process.cwd(), 'public/temp_uploads')];

  for (const dir of tempDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(path.join(dir, file));
        }
        sendLog(`🧹 Cleaned ${path.basename(dir)}`);
      } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
            const message = error.message;
            sendLog(`🧹 Cleanup failed for ${path.basename(dir)}: ${message}`);
        }
      }
  }
}
