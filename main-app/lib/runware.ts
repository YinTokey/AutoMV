import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { CONFIG } from './config';
import { makeRequest, downloadFile } from './utils';
import { sendLog } from './stream';
import { enhanceImagePrompt } from './openai';
import { recordCost } from './cost';
 
export async function generateImage(prompt: string, sceneNumber: number, characterImageDataURI: string | null, retryCount = 0): Promise<string> {
  sendLog(`🖼️ Generating image for scene ${sceneNumber}...`);
  if (!CONFIG.RUNWARE_API_KEY) throw new Error('RUNWARE_API_KEY not configured');

  try {
    const enhancedPrompt = await enhanceImagePrompt(prompt, !!characterImageDataURI);
    let payload;

    if (characterImageDataURI) {
      sendLog(`🧑 Incorporating character reference for scene ${sceneNumber} using data URI`);
      payload = {
        taskType: "imageInference",
        taskUUID: uuidv4(),
        model: "bfl:3@1",
        positivePrompt: enhancedPrompt,
        referenceImages: [characterImageDataURI],
        width: 1392,
        height: 752,
        numberResults: 1,
        outputFormat: "JPEG",
        includeCost: true,
      };
    } else {
      const negativePrompt = 'blurry, low quality, boring, flat, ugly, simple, watermark, text';

      payload = {
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
        guidanceScale: 7,
        includeCost: true,
      };
    }

    const response = await makeRequest('https://api.runware.ai/v1', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.RUNWARE_API_KEY}` },
      data: [payload]
    });

    const task = response.data[0];
    if (!task || !task.imageURL) throw new Error(`No image URL in response: ${JSON.stringify(response)}`);

    const imagePath = path.join(CONFIG.TEMP_DIR, `scene_${sceneNumber}_image.jpg`);
    await downloadFile(task.imageURL, imagePath);
    
    if (task.cost) {
      recordCost(task.cost, `Image generation for scene ${sceneNumber}`, 'Runware');
    }

    sendLog(`🖼️ Scene ${sceneNumber} image ready`);
    return imagePath;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (retryCount < 3) {
      sendLog(`⚠️ Error generating image for scene ${sceneNumber}: ${message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateImage(prompt, sceneNumber, characterImageDataURI, retryCount + 1);
    } else {
      throw new Error(`Failed to generate image for scene ${sceneNumber} after multiple retries: ${message}`);
    }
  }
}
 
export async function generateImagesConcurrently(scenes: { image_prompt: string }[], characterImageDataURI: string | null): Promise<string[]> {
     const imagePaths: string[] = [];
      for (let i = 0; i < scenes.length; i += CONFIG.MAX_CONCURRENT_IMAGES) {
        const batch = scenes.slice(i, i + CONFIG.MAX_CONCURRENT_IMAGES);
        sendLog(`🖼️ Starting image batch ${Math.floor(i / CONFIG.MAX_CONCURRENT_IMAGES) + 1}`);
        const batchPromises = batch.map((scene, batchIndex) => 
          generateImage(scene.image_prompt, i + batchIndex + 1, characterImageDataURI)
        );
        const resolvedPaths = await Promise.all(batchPromises);
        imagePaths.push(...resolvedPaths);
        if (i + CONFIG.MAX_CONCURRENT_IMAGES < scenes.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.IMAGE_BATCH_DELAY));
        }
      }
      sendLog('🖼️ All images generated!');
      return imagePaths;
} 