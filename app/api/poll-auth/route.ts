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
 * POST /api/poll-auth
 * Body: { state: string }
 *
 * Called by the plugin every 2 s while waiting for the Google OAuth popup to
 * complete. Uses the service-role key (server-side only) so the pending_auth
 * table can have RLS enabled with no public SELECT policy — tokens are never
 * readable via the anon API.
 *
 * On success: deletes the row immediately and returns the tokens.
 * On not found: returns { found: false }.
 */
export async function POST(request: NextRequest) {
  try {
    const { state } = await request.json()

    if (!state || typeof state !== 'string' || state.length < 8) {
      return NextResponse.json(
        { error: 'Invalid state parameter.' },
        { status: 400, headers: cors }
      )
    }

    // Service-role client — never exposed to the browser
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: row, error } = await supabase
      .from('pending_auth')
      .select('access_token, refresh_token')
      .eq('state', state)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: 'Lookup failed.' },
        { status: 500, headers: cors }
      )
    }

    if (!row) {
      return NextResponse.json({ found: false }, { headers: cors })
    }

    // Delete immediately — tokens are single-use
    await supabase.from('pending_auth').delete().eq('state', state)

    return NextResponse.json(
      {
        found: true,
        access_token: row.access_token,
        refresh_token: row.refresh_token,
      },
      { headers: cors }
    )
  } catch {
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500, headers: cors }
    )
  }
}
