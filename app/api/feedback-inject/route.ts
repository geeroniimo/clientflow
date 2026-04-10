import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      project_id,
      content,
      page_url,
      position_x_percent,
      position_y_percent,
      viewport_width,
      viewport_height,
      breakpoint,
    } = body

    console.log('📥 Feedback received:', { project_id, page_url, breakpoint })

    if (!project_id || !content) {
      return NextResponse.json(
        { error: 'project_id and content are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      console.error('❌ Project not found:', project_id)
      return NextResponse.json(
        { error: 'Invalid project' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Take screenshot server-side (best-effort — feedback saves even if it fails)
    let screenshotUrl: string | null = null
    if (page_url) {
      try {
        const bpDimensions: Record<string, { w: number; h: number }> = {
          Desktop: { w: 1440, h: 900 },
          Tablet:  { w: 810,  h: 1080 },
          Mobile:  { w: 390,  h: 844 },
        }
        const dim = bpDimensions[breakpoint] || bpDimensions.Desktop
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

        const screenshotResp = await fetch(`${baseUrl}/api/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: page_url, width: dim.w, height: dim.h }),
          signal: AbortSignal.timeout(20000),
        })

        if (screenshotResp.ok) {
          const buffer = Buffer.from(await screenshotResp.arrayBuffer())
          const filename = `${project_id}/${Date.now()}-${breakpoint || 'Desktop'}.png`
          const { data: upload, error: uploadError } = await supabase.storage
            .from('screenshots')
            .upload(filename, buffer, { contentType: 'image/png', cacheControl: '3600', upsert: false })

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('screenshots')
              .getPublicUrl(upload.path)
            screenshotUrl = publicUrl
            console.log('✅ Screenshot uploaded:', screenshotUrl)
          } else {
            console.error('❌ Upload error:', uploadError)
          }
        } else {
          console.error('❌ Screenshot API returned', screenshotResp.status)
        }
      } catch (err) {
        console.error('❌ Screenshot skipped:', err instanceof Error ? err.message : err)
      }
    }

    // Save feedback (always, even without screenshot)
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        project_id,
        content,
        screenshot_url: screenshotUrl,
        page_url,
        position_x_percent,
        position_y_percent,
        viewport_width,
        viewport_height,
        breakpoint,
        status: 'open',
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('❌ Feedback save error:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Feedback saved:', feedback.id)
    return NextResponse.json(
      { success: true, feedback_id: feedback.id },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500, headers: corsHeaders }
    )
  }
}
