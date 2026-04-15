import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Polar } from '@polar-sh/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: cors })
    }

    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! })

    // Step 1: try externalCustomerId (set by webhook after first purchase)
    try {
      const session = await polar.customerSessions.create({
        externalCustomerId: userId,
      })
      return NextResponse.json({ url: session.customerPortalUrl }, { headers: cors })
    } catch {
      // Fall through to email lookup
    }

    // Step 2: look up Polar customer by email (reliable fallback)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: cors })
    }

    const page = await polar.customers.list({ email: profile.email, limit: 1 })
    const customer = page.result?.items?.[0]

    if (!customer) {
      return NextResponse.json(
        { error: 'No Polar customer found for this account.' },
        { status: 404, headers: cors }
      )
    }

    const session = await polar.customerSessions.create({ customerId: customer.id })
    return NextResponse.json({ url: session.customerPortalUrl }, { headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create portal session'
    return NextResponse.json({ error: message }, { status: 500, headers: cors })
  }
}
