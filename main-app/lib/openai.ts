import { CONFIG } from './config';
import { makeRequest } from './utils';
import { sendLog } from './stream';

export async function optimizePrompt(prompt: string): Promise<string> {
  sendLog('🤖 Optimizing prompt...');
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
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
      }
    });

    const optimizedPrompt = response.choices[0].message.content.trim();
    sendLog(`🤖 Optimized prompt: ${optimizedPrompt.substring(0, 100)}...`);
    return optimizedPrompt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error optimizing prompt: ${message}`);
    throw new Error(`Failed to optimize prompt: ${message}`);
  }
}

export async function enhanceImagePrompt(prompt: string): Promise<string> {
  sendLog(`🎨 Enhancing image prompt: "${prompt.substring(0, 30)}..."`);
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert image prompt engineer. Your task is to take a user's prompt and enhance it to be more epic and fantastic. Focus on adding vivid descriptions, dynamic action, dramatic lighting, and a cinematic feel. The output should be a single, enhanced prompt string, ready to be used in an image generation model. Do not add any extra conversational text or formatting."
          },
          {
            role: "user",
            content: `Enhance this prompt: ${prompt}`
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      }
    });

    const enhancedPrompt = response.choices[0].message.content.trim();
    sendLog(`🎨 Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
    return enhancedPrompt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error enhancing image prompt: ${message}. Using original prompt.`);
    // Return original prompt as a fallback
    return prompt;
  }
}

export async function generateScenes(prompt: string, sceneCount: number) {
  sendLog('🎬 Generating scenes with OpenAI...');
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
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
      }
    });

    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content);
    if (!parsedResponse.scenes || !Array.isArray(parsedResponse.scenes)) {
      throw new Error('Invalid scenes format from OpenAI');
    }
    sendLog(`🎬 Generated ${parsedResponse.scenes.length} scenes`);
    return parsedResponse.scenes;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error generating scenes: ${message}`);
    throw new Error(`Failed to generate scenes: ${message}`);
  }
} 