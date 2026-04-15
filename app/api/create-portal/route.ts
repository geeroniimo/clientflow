import { NextRequest, NextResponse } from 'next/server'
import { Polar } from '@polar-sh/sdk'

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
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: cors }
      )
    }

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
    })

    // Create a short-lived customer portal session using the Supabase userId
    // as the externalCustomerId (set during checkout creation)
    const session = await polar.customerSessions.create({
      externalCustomerId: userId,
    })

    return NextResponse.json({ url: session.customerPortalUrl }, { headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create portal session'
    return NextResponse.json({ error: message }, { status: 500, headers: cors })
  }
}
