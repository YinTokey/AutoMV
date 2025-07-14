import path from 'path';

// Configuration
export const CONFIG = {
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