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
  try {
    const callbackPayload: SunoCallbackData = await request.json()

    console.log("Received music generation callback:", callbackPayload)

    if (!callbackPayload.data?.task_id) {
      return NextResponse.json({ error: "task_id is required in callback data" }, { status: 400 })
    }

    const taskId = callbackPayload.data.task_id

    // Determine status from callback type and code
    let status: "pending" | "completed" | "failed"
    let audioUrl: string | undefined
    let errorMessage: string | undefined

    if (callbackPayload.code === 200 && callbackPayload.data.callbackType === "complete") {
      status = "completed"
      // Get the first audio URL from the generated data
      if (callbackPayload.data.data && callbackPayload.data.data.length > 0) {
        audioUrl = callbackPayload.data.data[0].audio_url
      }
    } else if (callbackPayload.code !== 200 || callbackPayload.data.callbackType === "failed") {
      status = "failed"
      errorMessage = callbackPayload.msg || "Music generation failed"
    } else {
      status = "pending"
    }

    console.log(`Processing callback for task ${taskId}: status=${status}, audioUrl=${audioUrl}`)

    // Update the task in Supabase
    const updatedTask = await updateMusicTask(taskId, {
      status: status,
      audio_url: audioUrl,
      error_message: errorMessage
    })

    console.log("Updated music task in database:", updatedTask)

    // Note: SSE notifications removed - local script uses polling instead

    // Forward to local development server
    try {
      const localCallbackData = {
        taskId: taskId,
        status: status,
        audio_url: status === 'completed' ? audioUrl : undefined,
        error_message: status === 'failed' ? errorMessage : undefined,
        prompt: updatedTask?.prompt
      }

      // Get local development URL from environment or use default
      const localUrl = process.env.LOCAL_DEV_URL || 'http://localhost:3000'
      const callbackUrl = `${localUrl}/api/local-music-callback`
      
      console.log("🔄 Forwarding to local server:", callbackUrl)
      
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localCallbackData),
      })

      if (response.ok) {
        console.log("🔄 Successfully forwarded to local server")
      } else {
        console.warn("🔄 Failed to forward to local server:", response.status, response.statusText)
      }
      
    } catch (forwardError) {
      console.warn("🔄 Failed to forward to local server:", forwardError)
      // Don't fail the whole callback if forwarding fails
    }

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