import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(request: NextRequest) {
  try {
    const { url, width, height, dotXPercent, dotYPercent } = await request.json()

    console.log('📸 Screenshot request:', { url, width, height, dotXPercent, dotYPercent })

    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    const isDev = process.env.NODE_ENV === 'development'

    const executablePath = isDev
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : await chromium.executablePath()

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: isDev
        ? ['--no-sandbox']
        : [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: null,
    })

    const page = await browser.newPage()
    await page.setViewport({ width: width || 1440, height: height || 900, deviceScaleFactor: 1 })
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    )

    console.log(`🌐 Navigating to ${url}...`)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
    await new Promise((r) => setTimeout(r, 1000))

    console.log('📸 Taking screenshot...')
    const screenshotBuffer = (await page.screenshot({ type: 'png', fullPage: false })) as Buffer
    await browser.close()

    // Draw dot using sharp (lighter than canvas) or fall back to plain screenshot
    let finalBuffer = screenshotBuffer

    if (dotXPercent != null && dotYPercent != null) {
      try {
        const sharp = (await import('sharp')).default
        const meta = await sharp(screenshotBuffer).metadata()
        const imgW = meta.width || (width || 1440)
        const imgH = meta.height || (height || 900)

        const dotX = Math.round((dotXPercent / 100) * imgW)
        const dotY = Math.round((dotYPercent / 100) * imgH)
        const r = 14 // dot radius
        const rO = r + 4 // outer ring radius

        // Build an SVG overlay with the blue dot + white ring
        const svg = Buffer.from(
          `<svg width="${imgW}" height="${imgH}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${dotX}" cy="${dotY}" r="${rO}" fill="white" opacity="0.95"/>
            <circle cx="${dotX}" cy="${dotY}" r="${r}" fill="#0099FF"/>
          </svg>`
        )

        finalBuffer = await sharp(screenshotBuffer)
          .composite([{ input: svg, top: 0, left: 0 }])
          .png()
          .toBuffer()

        console.log('✅ Dot drawn at', dotX, dotY)
      } catch (dotErr) {
        console.error('❌ Dot drawing failed, returning plain screenshot:', dotErr)
      }
    }

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'image/png',
        'Content-Length': finalBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('❌ Screenshot error:', error)
    return NextResponse.json(
      { error: 'Failed to capture screenshot', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500, headers: cors }
    )
  }
}
