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

// Preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

const BP_DIMS: Record<string, { w: number; h: number }> = {
  Desktop: { w: 1440, h: 900 },
  Tablet:  { w: 810,  h: 1080 },
  Mobile:  { w: 390,  h: 844 },
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
    } = await request.json()

    if (!project_id || !content) return err('project_id and content are required', 400)

    // Verify project
    const { data: project, error: projectErr } = await supabase
      .from('projects').select('id').eq('id', project_id).single()
    if (projectErr || !project) return err('Invalid project', 404)

    // Server-side screenshot with blue dot (best-effort)
    let screenshotUrl: string | null = null
    if (page_url) {
      try {
        const dim = BP_DIMS[breakpoint] || BP_DIMS.Desktop
        const base = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

        const res = await fetch(`${base}/api/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: page_url, width: dim.w, height: dim.h,
            dotXPercent: position_x_percent,
            dotYPercent: position_y_percent,
          }),
          signal: AbortSignal.timeout(25000),
        })

        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          const path = `${project_id}/${Date.now()}-${breakpoint || 'Desktop'}.png`
          const { data: up, error: upErr } = await supabase.storage
            .from('screenshots')
            .upload(path, buf, { contentType: 'image/png', cacheControl: '3600', upsert: false })
          if (!upErr) {
            screenshotUrl = supabase.storage.from('screenshots').getPublicUrl(up.path).data.publicUrl
          }
        }
      } catch (e) {
        console.error('Screenshot skipped:', e instanceof Error ? e.message : e)
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

    if (fbErr) return err('Failed to save feedback')

    return ok({ success: true, feedback_id: feedback.id })
  } catch (e) {
    console.error('API error:', e)
    return err('Internal server error')
  }
}
