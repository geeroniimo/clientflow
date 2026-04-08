import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { url, width, height } = await request.json()

    console.log('📸 Screenshot request:', { url, width, height })

    // Importar Puppeteer (ya no necesitamos canvas)
    const puppeteer = (await import('puppeteer-core')).default

    // Determinar si estamos en desarrollo o producción
    const isDev = process.env.NODE_ENV === 'development'

    let executablePath: string

    if (isDev) {
      // En desarrollo (Mac): usar Chrome local
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      console.log('🔧 Using local Chrome for development')
    } else {
      // En producción (Vercel): usar chromium serverless
      const chromium = await import('@sparticuz/chromium')
      executablePath = await chromium.default.executablePath()
      console.log('☁️ Using serverless Chromium for production')
    }

    // Lanzar navegador
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: isDev ? [] : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    const page = await browser.newPage()
    
    // Configurar User-Agent como navegador real
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    
    // Configurar viewport
    await page.setViewport({ 
      width, 
      height,
      deviceScaleFactor: 1
    })

    console.log(`🌐 Navigating to ${url} with viewport ${width}x${height}...`)

    // Navegar a la URL
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 20000 
    })

    // Esperar carga completa de imágenes y fonts
    await page.evaluate(() => {
      return Promise.all([
        document.fonts.ready,
        ...Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve
          }))
      ])
    })

    // Delay para animaciones
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('📸 Taking screenshot...')

    // Screenshot limpio (sin procesar)
    const screenshotBuffer = await page.screenshot({ 
      type: 'png',
      fullPage: false
    }) as Buffer

    await browser.close()

    console.log('✅ Screenshot captured, size:', screenshotBuffer.length, 'bytes')

    // Devolver PNG puro (sin Canvas, sin pin)
    return new NextResponse(new Uint8Array(screenshotBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': screenshotBuffer.length.toString(),
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('❌ Screenshot error:', error)
    return NextResponse.json({ 
      error: 'Failed to capture screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}