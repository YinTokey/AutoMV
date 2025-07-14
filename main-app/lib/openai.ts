import { CONFIG } from './config';
import { makeRequest } from './utils';
import { sendLog } from './stream';
import fs from 'fs/promises';
import { recordCost } from './cost';

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
    if (response.usage) {
      recordCost({ input: response.usage.prompt_tokens, output: response.usage.completion_tokens }, 'gpt-4o', 'OpenAI');
    }
    sendLog(`🤖 Optimized prompt: ${optimizedPrompt.substring(0, 100)}...`);
    return optimizedPrompt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error optimizing prompt: ${message}`);
    throw new Error(`Failed to optimize prompt: ${message}`);
  }
}

export async function enhanceImagePrompt(prompt: string, hasCharacterReference: boolean): Promise<string> {
  sendLog(`🎨 Enhancing image prompt: "${prompt.substring(0, 30)}..."`);
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const systemContent = hasCharacterReference
    ? `You are an expert image prompt engineer specializing in character-focused art. Your task is to enhance the user's prompt to be more epic and fantastic, with a special focus on describing the character in rich detail. Ensure the character description is vivid, including details about their appearance, expression, attire, and action. This should contribute to a high-quality, cinematic image that highlights the character. The output should be a single, enhanced prompt string, ready for an image generation model. Do not add any extra conversational text or formatting.`
    : `You are an expert image prompt engineer. Your task is to take a user's prompt and enhance it to be more epic and fantastic. Focus on adding vivid descriptions, dynamic action, dramatic lighting, and a cinematic feel. The output should be a single, enhanced prompt string, ready to be used in an image generation model. Do not add any extra conversational text or formatting.`;

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemContent,
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
    if (response.usage) {
      recordCost({ input: response.usage.prompt_tokens, output: response.usage.completion_tokens }, 'gpt-4o', 'OpenAI');
    }
    sendLog(`🎨 Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
    return enhancedPrompt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error enhancing image prompt: ${message}. Using original prompt.`);
    // Return original prompt as a fallback
    return prompt;
  }
}

export async function enhanceMusicPromptWithImage(originalMusicPrompt: string, imagePath: string): Promise<string> {
  sendLog(`🎶 Enhancing music prompt using image: ${imagePath}`);
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const imageAsBase64 = imageBuffer.toString('base64');
    const imageDataURI = `data:image/jpeg;base64,${imageAsBase64}`;

    const systemContent = `You are an expert music composer AI. Your task is to analyze an image and an original music prompt, then generate a new, enhanced music prompt.

The new prompt should:
1.  Be inspired by the image's mood, style, color palette, and content (including any characters and their apparent gender).
2.  Incorporate the core idea of the original music prompt.
3.  Be concise and evocative, under 30 words.
4.  Result in music that perfectly fits the visual.

Output only the new music prompt string, with no extra text.`;

    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Original music prompt: "${originalMusicPrompt}"` },
              {
                type: "image_url",
                image_url: {
                  url: imageDataURI,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }
    });

    const enhancedPrompt = response.choices[0].message.content.trim();
    if (response.usage) {
      recordCost({ input: response.usage.prompt_tokens, output: response.usage.completion_tokens }, 'gpt-4o', 'OpenAI');
    }
    sendLog(`🎶 Enhanced music prompt: ${enhancedPrompt}`);
    return enhancedPrompt;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error enhancing music prompt with image: ${message}. Using original prompt.`);
    return originalMusicPrompt;
  }
}


export async function generateScenes(prompt: string, sceneCount: number) {
  sendLog('🎬 Generating scenes with OpenAI...');
  if (!CONFIG.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const systemContent = `You are an expert music video director. Your task is to create a series of detailed scene breakdowns for a music video based on the user's prompt.

For each scene, you must provide the following:
1.  An **image prompt** that vividly describes the visuals.
2.  A **music prompt** for generating accompanying music. This prompt should include the overall mood, style, and instrumentation.
3.  A **music style** (e.g., 'cinematic', 'pop', 'ambient').
4.  A **title** for the music track.

**Crucially, you must intelligently infer the appropriate singer gender (male or female) from the user's prompt.** If the prompt contains gendered language (e.g., 'she', 'her', 'a song about a queen'), the music prompt must specify a vocalist of that gender. If no gender is implied, you can choose a neutral or fitting voice.

Return a JSON object with the following structure: { "scenes": [ { "scene_number": 1, "image_prompt": "...", "music_prompt": "...", "style": "...", "title": "..." } ] }`;

  try {
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
      data: {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemContent,
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
    if (response.usage) {
      recordCost({ input: response.usage.prompt_tokens, output: response.usage.completion_tokens }, 'gpt-4o', 'OpenAI');
    }
    sendLog(`🎬 Generated ${parsedResponse.scenes.length} scenes`);
    return parsedResponse.scenes;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    sendLog(`⚠️ Error generating scenes: ${message}`);
    throw new Error(`Failed to generate scenes: ${message}`);
  }
} 