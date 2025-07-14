import { NextRequest } from 'next/server';
import { setStreamController, sendError } from '../../../lib/stream';
import { runGeneration } from '../../../lib/generation';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const prompt = formData.get('prompt') as string;
  const sceneCount = parseInt(formData.get('sceneCount') as string, 10);
  const instrumental = formData.get('instrumental') === 'true';
  const characterImageFile = formData.get('characterImage') as File | null;

  const stream = new ReadableStream({
    start(controller) {
      setStreamController(controller);
      runGeneration(prompt, sceneCount, instrumental, characterImageFile)
        .catch(e => {
          const message = e instanceof Error ? e.message : String(e);
          sendError(message);
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
