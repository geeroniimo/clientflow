import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage } from 'canvas'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { url, width, height, dotXPercent, dotYPercent } = await request.json()

    console.log('📸 Screenshot request:', { url, width, height, dotXPercent, dotYPercent })

    const puppeteer = (await import('puppeteer-core')).default
    const isDev = process.env.NODE_ENV === 'development'

    const executablePath = isDev
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : await (await import('@sparticuz/chromium')).default.executablePath()

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: isDev ? [] : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width, height, deviceScaleFactor: 1 })

    console.log(`🌐 Navigating to ${url}...`)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 })

    // Wait for fonts and images
    await page.evaluate(() =>
      Promise.all([
        document.fonts.ready,
        ...Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((r) => { img.onload = img.onerror = r })),
      ])
    )
    await new Promise((r) => setTimeout(r, 1500))

    console.log('📸 Taking screenshot...')
    const screenshotBuffer = (await page.screenshot({ type: 'png', fullPage: false })) as Buffer
    await browser.close()

    // Draw blue dot at click position using canvas
    let finalBuffer = screenshotBuffer
    if (dotXPercent != null && dotYPercent != null) {
      try {
        const img = await loadImage(screenshotBuffer)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')

        ctx.drawImage(img, 0, 0)

        const dotX = (dotXPercent / 100) * img.width
        const dotY = (dotYPercent / 100) * img.height
        const radius = 12

        // Outer white ring
        ctx.beginPath()
        ctx.arc(dotX, dotY, radius + 3, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 8
        ctx.fill()

        // Blue dot
        ctx.beginPath()
        ctx.arc(dotX, dotY, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#0099FF'
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.fill()

        finalBuffer = canvas.toBuffer('image/png')
        console.log('✅ Dot drawn at', dotX.toFixed(0), dotY.toFixed(0))
      } catch (dotErr) {
        console.error('❌ Dot drawing failed, returning plain screenshot:', dotErr)
      }
    }

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': finalBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('❌ Screenshot error:', error)
    return NextResponse.json(
      { error: 'Failed to capture screenshot', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
