export let streamController: ReadableStreamDefaultController<string>;
export const generatedVideos: string[] = [];

export function setStreamController(controller: ReadableStreamDefaultController<string>) {
    streamController = controller;
}

export function sendLog(log: string) {
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ log })}\n\n`);
  }
}

export function sendError(error: string) {
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ error })}\n\n`);
  }
}

export function sendVideoUrl(videoUrl: string) {
  generatedVideos.push(videoUrl);
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ videoUrl, videoList: generatedVideos })}\n\n`);
  }
} 

export function sendCost(cost: any) {
  if (streamController) {
    streamController.enqueue(`data: ${JSON.stringify({ cost })}\n\n`);
  }
} 