import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Create a function to get the Supabase client, allowing for graceful error handling
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.local file.')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Database types
export interface MusicGenerationTask {
  id?: string
  task_id: string
  prompt: string
  duration: number
  status: 'pending' | 'completed' | 'failed'
  audio_url?: string
  error_message?: string
  created_at?: string
  updated_at?: string
}

// Database functions
export async function createMusicTask(taskData: Omit<MusicGenerationTask, 'id' | 'created_at' | 'updated_at'>): Promise<MusicGenerationTask> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('music_generation_tasks')
    .insert([taskData])
    .select()
    .single()

  if (error) {
    console.error('Error creating music task:', error)
    throw new Error(`Failed to create music task: ${error.message}`)
  }

  return data
}

export async function updateMusicTask(taskId: string, updates: Partial<MusicGenerationTask>): Promise<MusicGenerationTask> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('music_generation_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating music task:', error)
    throw new Error(`Failed to update music task: ${error.message}`)
  }

  return data
}

export async function getMusicTask(taskId: string): Promise<MusicGenerationTask | null> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('music_generation_tasks')
    .select('*')
    .eq('task_id', taskId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error getting music task:', error)
    throw new Error(`Failed to get music task: ${error.message}`)
  }

  return data
}

export async function deleteMusicTask(taskId: string): Promise<void> {
  const client = getSupabaseClient()
  const { error } = await client
    .from('music_generation_tasks')
    .delete()
    .eq('task_id', taskId)

  if (error) {
    console.error('Error deleting music task:', error)
    throw new Error(`Failed to delete music task: ${error.message}`)
  }
} 