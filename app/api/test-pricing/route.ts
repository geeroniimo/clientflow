import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-pricing
 * Temporary test route — reads the current product price from Polar
 * and shows what the dynamic pricing logic would update it to (+$1).
 * No purchase required, no price change made.
 * Delete this file once dynamic pricing is confirmed working.
 */
export async function GET() {
  const productId = process.env.POLAR_PRODUCT_ID
  const token = process.env.POLAR_ACCESS_TOKEN

  if (!productId || !token) {
    return NextResponse.json({ error: 'POLAR_PRODUCT_ID or POLAR_ACCESS_TOKEN not set' }, { status: 500 })
  }

  try {
    const res = await fetch(`https://api.polar.sh/v1/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Failed to fetch product', detail: text }, { status: 500 })
    }

    const product = await res.json()

    const prices = (product.prices as any[]) ?? []
    const fixedPrice = prices.find(
      (p: any) => p.type === 'one_time' && p.amount_type === 'fixed'
    )

    if (!fixedPrice) {
      return NextResponse.json({
        error: 'No fixed one-time price found on this product',
        allPrices: prices,
      })
    }

    return NextResponse.json({
      ok: true,
      productId: product.id,
      productName: product.name,
      currentAmount: fixedPrice.price_amount,
      currentAmountFormatted: `$${(fixedPrice.price_amount / 100).toFixed(2)}`,
      wouldUpdateTo: fixedPrice.price_amount + 100,
      wouldUpdateToFormatted: `$${((fixedPrice.price_amount + 100) / 100).toFixed(2)}`,
      currency: fixedPrice.price_currency ?? 'usd',
      dryRunActive: process.env.POLAR_PRICING_DRY_RUN === 'true',
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', detail: err?.message }, { status: 500 })
  }
}
