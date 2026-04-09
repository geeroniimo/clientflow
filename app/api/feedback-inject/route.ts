import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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
      breakpoint
    } = body

    console.log('📥 Feedback from injected script:', {
      project_id,
      content,
      page_url,
      position_x_percent,
      position_y_percent,
      breakpoint
    })

    if (!project_id) {
      return NextResponse.json({ error: 'Project ID required' }, {
        status: 400,
        headers: corsHeaders
      })
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      console.error('❌ Project not found:', project_id)
      return NextResponse.json({ error: 'Invalid project' }, {
        status: 404,
        headers: corsHeaders
      })
    }

    console.log('✅ Project found:', project_id)

    let screenshotUrl = null

    try {
      console.log('📸 Capturing screenshot...')
      
      const screenshotResponse = await fetch('http://localhost:3000/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: page_url,
          width: viewport_width || 1200,
          height: viewport_height || 800
        })
      })

      if (screenshotResponse.ok) {
        const screenshotBlob = await screenshotResponse.blob()
        const arrayBuffer = await screenshotBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const filename = `feedback-${Date.now()}.png`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(filename, buffer, {
            contentType: 'image/png',
            cacheControl: '3600'
          })

        if (uploadError) {
          console.error('❌ Upload error:', uploadError)
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('screenshots')
            .getPublicUrl(filename)

          screenshotUrl = publicUrlData.publicUrl
          console.log('✅ Screenshot uploaded:', screenshotUrl)
        }
      } else {
        console.error('❌ Screenshot failed')
      }
    } catch (screenshotError) {
      console.error('❌ Screenshot error:', screenshotError)
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        project_id: project_id,
        content,
        screenshot_url: screenshotUrl,
        page_url,
        position_x_percent,
        position_y_percent,
        viewport_width,
        viewport_height,
        breakpoint,
        status: 'open'
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('❌ Feedback save error:', feedbackError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { 
        status: 500,
        headers: corsHeaders
      })
    }

    console.log('✅ Feedback saved:', feedback.id)

    return NextResponse.json({ 
      success: true, 
      feedback_id: feedback.id 
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  })
}