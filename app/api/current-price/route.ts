import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

/**
 * GET /api/current-price
 * Returns the current live price of the Polar product.
 * Called by the plugin paywall screen on mount.
 */
export async function GET() {
  const productId = process.env.POLAR_PRODUCT_ID
  const token = process.env.POLAR_ACCESS_TOKEN

  if (!productId || !token) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500, headers: cors })
  }

  try {
    const res = await fetch(`https://api.polar.sh/v1/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 }, // always fresh
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500, headers: cors })
    }

    const product = await res.json()
    const fixedPrice = (product.prices as any[]).find(
      (p: any) => p.type === 'one_time' && p.amount_type === 'fixed'
    )

    if (!fixedPrice) {
      return NextResponse.json({ error: 'No price found' }, { status: 404, headers: cors })
    }

    return NextResponse.json({
      amount: fixedPrice.price_amount,
      formatted: `$${(fixedPrice.price_amount / 100).toFixed(0)}`,
      currency: fixedPrice.price_currency ?? 'usd',
    }, { headers: cors })
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500, headers: cors })
  }
}
