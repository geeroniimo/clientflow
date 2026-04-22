import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export async function GET(request: NextRequest) {
  try {
    const project_id = request.nextUrl.searchParams.get('project_id')
    const page_url   = request.nextUrl.searchParams.get('page_url')
    if (!project_id) return err('project_id required', 400)

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('feedbacks')
      .select('id, content, position_x_percent, position_y_percent, position_x2_percent, position_y2_percent, feedback_type, status, created_at, page_url, breakpoint')
      .eq('project_id', project_id)
      .neq('status', 'resolved')
      .not('position_x_percent', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500, headers: cors })
    }

    // Normalize: strip trailing slashes and query string, lowercase
    const norm = (u: string) => (u || '').toLowerCase().replace(/\/+$/, '').split('?')[0]
    const currentPage = norm(page_url || '')

    const dots = (data || []).filter((f: any) =>
      !page_url || norm(f.page_url) === currentPage
    )

    return ok({ feedbacks: dots })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: cors })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      project_id, content, page_url,
      position_x_percent, position_y_percent,
      position_x2_percent, position_y2_percent, feedback_type,
      viewport_width, viewport_height, breakpoint,
    } = await request.json()

    if (!project_id || !content) return err('project_id and content are required', 400)

    // Verify project exists
    const { data: project, error: projectErr } = await supabase
      .from('projects').select('id').eq('id', project_id).single()
    if (projectErr || !project) return err('Invalid project', 404)

    const insertData = {
      project_id, content, screenshot_url: null,
      page_url, position_x_percent, position_y_percent,
      position_x2_percent: position_x2_percent ?? null,
      position_y2_percent: position_y2_percent ?? null,
      feedback_type: feedback_type ?? 'point',
      viewport_width, viewport_height, breakpoint, status: 'open',
    }

    const { data: feedback, error: fbErr } = await supabase
      .from('feedbacks')
      .insert(insertData)
      .select().single()

    if (fbErr) return err(`Failed to save: ${fbErr.message}`)

    return ok({ success: true, feedback_id: feedback.id })
  } catch {
    return err('Internal server error')
  }
}
