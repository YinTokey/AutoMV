import { type NextRequest, NextResponse } from "next/server"
import { getMusicTask, createMusicTask } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log("📊 Checking status for task:", taskId)

    // Get task from Supabase
    const task = await getMusicTask(taskId)

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    console.log(`📊 Task ${taskId} status: ${task.status}`)

    return NextResponse.json({
      taskId: task.task_id,
      status: task.status,
      audio_url: task.audio_url,
      error_message: task.error_message,
      created_at: task.created_at,
      updated_at: task.updated_at,
      prompt: task.prompt,
      duration: task.duration
    })

  } catch (error) {
    console.error("Error checking music status:", error)
    return NextResponse.json({ 
      error: "Failed to check music status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const taskData = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log("📝 Storing new music task:", taskId, taskData)

    // Create new task in Supabase
    const newTask = await createMusicTask({
      task_id: taskId,
      prompt: taskData.prompt || '',
      duration: taskData.duration || 30,
      status: taskData.status || 'pending'
    })

    console.log(`📝 Task ${taskId} stored successfully`)

    return NextResponse.json({
      success: true,
      task: newTask
    })

  } catch (error) {
    console.error("Error storing music task:", error)
    return NextResponse.json({ 
      error: "Failed to store music task",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 