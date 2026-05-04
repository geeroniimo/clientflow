import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

/**
 * POST /api/relay-auth
 * Body: { state: string, access_token: string, refresh_token: string }
 *
 * Called by the OAuth callback page after Google redirects back.
 * Uses the service-role key server-side so pending_auth needs zero
 * anon policies — no public read or write access at all.
 */
export async function POST(request: NextRequest) {
  try {
    const { state, access_token, refresh_token } = await request.json()

    if (!state || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400, headers: cors }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error } = await supabase.from('pending_auth').insert({
      state,
      access_token,
      refresh_token,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to relay session: ' + error.message },
        { status: 500, headers: cors }
      )
    }

    return NextResponse.json({ ok: true }, { headers: cors })
  } catch {
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500, headers: cors }
    )
  }
}
