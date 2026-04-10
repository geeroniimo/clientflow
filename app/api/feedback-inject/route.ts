import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

function ok(data: object) {
  return NextResponse.json(data, { headers: cors })
}
function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status, headers: cors })
}

export async function POST(request: NextRequest) {
  try {
    const {
      project_id, content, page_url,
      position_x_percent, position_y_percent,
      viewport_width, viewport_height, breakpoint,
      screenshot_base64,
    } = await request.json()

    if (!project_id || !content) return err('project_id and content are required', 400)

    // Verify project exists
    const { data: project, error: projectErr } = await supabase
      .from('projects').select('id').eq('id', project_id).single()
    if (projectErr || !project) return err('Invalid project', 404)

    // Upload screenshot if provided (client-side base64 JPEG)
    let screenshotUrl: string | null = null
    if (screenshot_base64) {
      try {
        // Strip data URL prefix → raw base64
        const base64Data = screenshot_base64.replace(/^data:image\/\w+;base64,/, '')
        const buf = Buffer.from(base64Data, 'base64')
        const path = `${project_id}/${Date.now()}.jpg`

        const { data: up, error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(path, buf, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })

        if (!upErr && up) {
          screenshotUrl = supabase.storage.from('screenshots').getPublicUrl(up.path).data.publicUrl
        } else {
          console.error('Screenshot upload error:', upErr)
        }
      } catch (e) {
        console.error('Screenshot processing error:', e instanceof Error ? e.message : e)
      }
    }

    // Save feedback
    const { data: feedback, error: fbErr } = await supabase
      .from('feedbacks')
      .insert({
        project_id, content, screenshot_url: screenshotUrl,
        page_url, position_x_percent, position_y_percent,
        viewport_width, viewport_height, breakpoint, status: 'open',
      })
      .select().single()

    if (fbErr) {
      console.error('Feedback insert error:', fbErr)
      return err('Failed to save feedback')
    }

    return ok({ success: true, feedback_id: feedback.id })
  } catch (e) {
    console.error('API error:', e)
    return err('Internal server error')
  }
}
