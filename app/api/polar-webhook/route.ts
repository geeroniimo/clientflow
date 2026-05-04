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
        subscription_id: order.customerId,
        subscription_plan: 'pro',
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── Dynamic pricing: increment product price by $1 on every paid order ──
  if (event.type === 'order.paid') {
    const order = (event as {
      data: {
        product: { id: string }
        billingReason?: string
      }
    }).data

    // Only react to one-time purchases, not subscription renewals
    if (order.billingReason && order.billingReason !== 'purchase') {
      return NextResponse.json({ received: true, skipped: 'not a one-time purchase' })
    }

    const productId = order.product.id
    const token = process.env.POLAR_ACCESS_TOKEN!
    const baseUrl = 'https://api.polar.sh'

    try {
      // 1. Fetch current product to read the existing price
      const productRes = await fetch(`${baseUrl}/v1/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!productRes.ok) {
        console.error('[polar-webhook] failed to fetch product:', await productRes.text())
        return NextResponse.json({ received: true, warning: 'Could not fetch product' })
      }

      const product = await productRes.json()

      // Find the first fixed one-time price
      const currentPrice = (product.prices as any[]).find(
        (p: any) => p.type === 'one_time' && p.amount_type === 'fixed'
      )

      if (!currentPrice) {
        return NextResponse.json({ received: true, warning: 'No fixed one-time price found' })
      }

      const newAmount = currentPrice.price_amount + 100 // +$1 (cents)

      // 2. Patch the product with the incremented price
      // Omitting the existing price ID removes it; supplying a new object creates it.
      const patchRes = await fetch(`${baseUrl}/v1/products/${productId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: [
            {
              type: 'one_time',
              amount_type: 'fixed',
              price_amount: newAmount,
              price_currency: currentPrice.price_currency ?? 'usd',
            },
          ],
        }),
      })

      if (!patchRes.ok) {
        console.error('[polar-webhook] failed to update price:', await patchRes.text())
        return NextResponse.json({ received: true, warning: 'Price update failed' })
      }
    } catch (err) {
      console.error('[polar-webhook] dynamic pricing error:', err)
      return NextResponse.json({ received: true, warning: 'Unexpected error during price update' })
    }
  }

  return NextResponse.json({ received: true })
}
