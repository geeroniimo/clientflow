import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

// Supabase admin client — bypasses RLS so we can update any user's profile
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Polar sends the raw body for signature verification — we must read it as text
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

  // order.created fires for every order (purchase, subscription start, renewal).
  // We only activate the account when the order is actually paid.
  if (event.type === 'order.created') {
    const order = (event as { data: { id: string; paid: boolean; metadata?: Record<string, string> } }).data

    // Skip unpaid orders (e.g. free trials, pending invoices)
    if (!order.paid) {
      return NextResponse.json({ received: true, skipped: 'order not paid' })
    }

    const metadata = order.metadata ?? {}
    const userId = metadata['supabase_user_id']

    if (!userId) {
      return NextResponse.json({ received: true, warning: 'No supabase_user_id in metadata' })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_id: order.id,
        subscription_plan: 'pro',
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Always 200 — Polar retries on any non-2xx response
  return NextResponse.json({ received: true })
}
