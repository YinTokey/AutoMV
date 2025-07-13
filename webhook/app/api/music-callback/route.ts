import { type NextRequest, NextResponse } from "next/server"
import { updateMusicTask } from "@/lib/supabase"

interface SunoCallbackData {
  code: number
  msg: string
  data: {
    callbackType: string
    task_id: string
    data: Array<{
      id: string
      audio_url: string
      source_audio_url: string
      stream_audio_url: string
      source_stream_audio_url: string
      image_url: string
      source_image_url: string
      prompt: string
      model_name: string
      title: string
      tags: string
      createTime: string
      duration: number
    }>
  }
}

export async function POST(request: NextRequest) {
  // Clone the request to log the raw body, as .json() consumes it
  const requestClone = request.clone();
  try {
    const rawBody = await requestClone.text();
    console.log('--- Suno Callback Received ---');
    console.log('Raw Payload:', rawBody);
    
    // Now, parse the JSON from the original request
    const callbackPayload: SunoCallbackData = await request.json();
    console.log('Parsed Payload:', JSON.stringify(callbackPayload, null, 2));

    if (!callbackPayload.data?.task_id) {
      console.error('Callback Error: task_id is missing from payload.');
      return NextResponse.json({ error: "task_id is required in callback data" }, { status: 400 });
    }

    const taskId = callbackPayload.data.task_id;
    console.log(`Processing Task ID: ${taskId}`);

    // Determine status from callback type and code
    let status: "pending" | "completed" | "failed";
    let audioUrl: string | undefined;
    let errorMessage: string | undefined;

    if (callbackPayload.code === 200 && callbackPayload.data.callbackType === "complete") {
      status = "completed";
      if (callbackPayload.data.data && callbackPayload.data.data.length > 0) {
        audioUrl = callbackPayload.data.data[0].audio_url;
        console.log(`Status: completed. Audio URL found: ${audioUrl}`);
      } else {
        status = "failed";
        errorMessage = "'completed' status but no audio data in payload.";
        console.error(`Callback Error for ${taskId}: ${errorMessage}`);
      }
    } else if (callbackPayload.code !== 200 || callbackPayload.data.callbackType === "failed") {
      status = "failed";
      errorMessage = callbackPayload.msg || "Music generation failed";
      console.log(`Status: failed. Reason: ${errorMessage}`);
    } else {
      status = "pending";
      console.log(`Status: pending. Reason: ${callbackPayload.msg}`);
    }



    const updates = {
      status: status,
      audio_url: audioUrl,
      error_message: errorMessage
    };

    console.log(`Attempting to update task ${taskId} in Supabase with:`, updates);
    
    // Update the task in Supabase
    const updatedTask = await updateMusicTask(taskId, updates);

    console.log(`Successfully updated task ${taskId} in database. New data:`, updatedTask);

    // Note: SSE notifications removed - local script uses polling instead



    return NextResponse.json({ 
      success: true, 
      message: "Callback processed successfully",
      task: updatedTask,
      parsedData: {
        taskId,
        status,
        audioUrl,
        errorMessage
      }
    })

  } catch (error) {
    console.error("Error processing music callback:", error)
    return NextResponse.json({ 
      error: "Failed to process callback", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Music callback endpoint. Use POST to send callback data."
  })
} 