import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Polar } from '@polar-sh/sdk'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  let event: ReturnType<typeof validateEvent>
  try {
    event = validateEvent(
      rawBody,
      Object.fromEntries(request.headers.entries()),
      process.env.POLAR_WEBHOOK_SECRET!
    )
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }

  if (event.type === 'order.created') {
    const order = (event as {
      data: {
        id: string
        paid: boolean
        customerId: string
        metadata?: Record<string, string>
      }
    }).data

    if (!order.paid) {
      return NextResponse.json({ received: true, skipped: 'order not paid' })
    }

    const metadata = order.metadata ?? {}
    const userId = metadata['supabase_user_id']

    if (!userId) {
      return NextResponse.json({ received: true, warning: 'No supabase_user_id in metadata' })
    }

    // Tag the Polar customer with the Supabase userId as externalCustomerId
    // so the customer portal lookup works by external ID going forward
    try {
      const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! })
      await polar.customers.update({
        id: order.customerId,
        customerUpdate: { externalId: userId },
      })
    } catch {
      // Non-fatal — portal will fall back to email lookup
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_id: order.customerId, // store Polar customerId for portal lookups
        subscription_plan: 'pro',
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
