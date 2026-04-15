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
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400, headers: cors }
      )
    }

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
    })

    const checkout = await polar.checkouts.create({
      products: [process.env.POLAR_PRODUCT_ID!],
      customerEmail: email,
      // externalCustomerId links the Polar customer to the Supabase user so we
      // can create a portal session later without a separate customer lookup
      externalCustomerId: userId,
      metadata: {
        supabase_user_id: userId,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://clientflow-git-main-geeroniimos-projects.vercel.app'}/checkout/success`,
    })

    return NextResponse.json({ url: checkout.url }, { headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout'
    return NextResponse.json({ error: message }, { status: 500, headers: cors })
  }
}
