'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://migzfwahooddgetnmifw.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ3pmd2Fob29kZGdldG5taWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDk4ODksImV4cCI6MjA5MTAyNTg4OX0.wFLwZA1jERxwb6XCruebBADrcnQU-K9ojENG3JAsaBc"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const BREAKPOINTS = [
  { name: 'Desktop', width: 1200, icon: 'desktop' },
  { name: 'Tablet', width: 810, icon: 'tablet' },
  { name: 'Mobile', width: 390, icon: 'mobile' }
]

// Iconos SVG
const DesktopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const TabletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const MobileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="1" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 12.25c3.176 0 5.75-2.145 5.75-4.792S10.176 2.667 7 2.667s-5.75 2.145-5.75 4.791c0 1.057.43 2.017 1.142 2.753L1.167 12.25l2.04-1.142A6.308 6.308 0 0 0 7 12.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.833 1.167L6.417 7.583M12.833 1.167l-4.083 11.666-2.333-5.25-5.25-2.333 11.666-4.083z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const getIcon = (iconName: string) => {
  switch(iconName) {
    case 'desktop': return <DesktopIcon />
    case 'tablet': return <TabletIcon />
    case 'mobile': return <MobileIcon />
    default: return null
  }
}

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null)
  const [project, setProject] = useState<any>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedBreakpoint, setSelectedBreakpoint] = useState(BREAKPOINTS[0])
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [commentBox, setCommentBox] = useState<{ x: number; y: number; xPercent: number; yPercent: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Unwrap params en useEffect para evitar hydration issues
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    // Inyectar keyframes para el spinner
    const styleSheet = document.createElement('style')
    styleSheet.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(styleSheet)

    // Cargar proyecto
    loadProject()

    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [])

  useEffect(() => {
    // Auto-focus en textarea cuando aparece el comment box
    if (commentBox && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [commentBox])

  useEffect(() => {
    // Escuchar tecla "C" para activar modo feedback
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo activar si no hay comment box abierto y la tecla es "C" (no en inputs)
      if (!commentBox && !feedbackMode && e.key.toLowerCase() === 'c' && 
          e.target instanceof HTMLElement && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA') {
        setFeedbackMode(true)
      }

      // CMD+Enter o Ctrl+Enter para enviar (solo en textarea)
      if (commentBox && e.target instanceof HTMLTextAreaElement && 
          (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (feedbackText.trim()) {
          handleSubmitFeedback()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [commentBox, feedbackMode, feedbackText])

  // Cargar proyecto cuando token esté disponible
  useEffect(() => {
    if (token) {
      loadProject()
    }
  }, [token])

  const loadProject = async () => {
    if (!token) return
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('token', token)
      .single()

    if (data) {
      setProject(data)
    }
    setLoading(false)
  }

  const handleBreakpointChange = (breakpoint: typeof BREAKPOINTS[0]) => {
    setSelectedBreakpoint(breakpoint)
    setCommentBox(null)
    setFeedbackMode(false)
  }

  const startFeedbackMode = () => {
    setFeedbackMode(true)
    setCommentBox(null)
    setFeedbackText('')
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!feedbackMode || !iframeContainerRef.current) return

    // Usar el contenedor del iframe (deviceFrame) para cálculo preciso
    const rect = iframeContainerRef.current.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    const relativeX = e.clientX - rect.left
    const relativeY = e.clientY - rect.top

    // IMPORTANTE: Usar selectedBreakpoint.width para el cálculo, NO rect.width
    // Esto asegura que las coordenadas sean exactamente relativas al viewport del iframe
    const xPercent = (relativeX / selectedBreakpoint.width) * 100
    const yPercent = (relativeY / rect.height) * 100

    console.log('📍 Click coordinates:', {
      clientX: x,
      clientY: y,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
      breakpointWidth: selectedBreakpoint.width,
      relativeX,
      relativeY,
      xPercent: xPercent.toFixed(2),
      yPercent: yPercent.toFixed(2)
    })

    setCommentBox({ x, y, xPercent, yPercent })
    setFeedbackMode(false)
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !project || !commentBox) return
  
    setIsSubmitting(true)
  
    try {
      let screenshotUrl = null
  
      // 1. Capturar screenshot con Puppeteer (limpio, sin pin)
      const containerHeight = iframeContainerRef.current?.clientHeight || 800
      
      console.log('📸 Screenshot request:', {
        breakpoint: selectedBreakpoint.name,
        width: selectedBreakpoint.width,
        height: containerHeight,
        note: 'Pin will be added via CSS in dashboard'
      })
      
      const screenshotResponse = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: project.framer_url,
          width: selectedBreakpoint.width,
          height: containerHeight
        })
      })
  
      if (screenshotResponse.ok) {
        const blob = await screenshotResponse.blob()
  
        // 2. Subir a Supabase Storage
        console.log('☁️ Uploading to Supabase...')
        
        const fileName = `feedback-${Date.now()}.png`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(fileName, blob)
  
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('screenshots')
            .getPublicUrl(fileName)
          
          screenshotUrl = urlData.publicUrl
          console.log('✅ Screenshot uploaded:', screenshotUrl)
        }
      } else {
        console.warn('⚠️ Screenshot failed, saving feedback without image')
      }
  
      // 3. Guardar feedback en DB
      const currentPageUrl = window.location.href
  
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          project_id: project.id,
          content: feedbackText,
          page_url: currentPageUrl,
          screenshot_url: screenshotUrl,
          position_x_percent: commentBox.xPercent,
          position_y_percent: commentBox.yPercent,
          viewport_width: selectedBreakpoint.width,
          viewport_height: iframeContainerRef.current?.clientHeight || 800,
          breakpoint: selectedBreakpoint.name.toLowerCase(),
          status: 'open'
        })
  
      if (!error) {
        setFeedbackText('')
        setCommentBox(null)
        alert('✓ Feedback sent!')
      } else {
        alert('Error saving feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Error sending feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setCommentBox(null)
    setFeedbackText('')
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!project) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorTitle}>Project not found</p>
        <p style={styles.errorText}>This review link is invalid or expired.</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.projectName}>{project.name}</h1>
          <p style={styles.headerSubtext}>
            {feedbackMode ? 'Click anywhere to place your comment' : 'Press C or click Leave Feedback to start'}
          </p>
        </div>

        <div style={styles.headerRight}>
          {/* Breakpoint selector */}
          <div style={styles.breakpointSelector}>
            {BREAKPOINTS.map((bp) => (
              <button
                key={bp.name}
                onClick={() => handleBreakpointChange(bp)}
                style={{
                  ...styles.breakpointButton,
                  ...(selectedBreakpoint.name === bp.name ? styles.breakpointButtonActive : {})
                }}
              >
                {getIcon(bp.icon)}
                <span>{bp.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={startFeedbackMode}
            disabled={feedbackMode}
            style={{
              ...styles.feedbackButton,
              ...(feedbackMode ? styles.feedbackButtonActive : {})
            }}
          >
            <MessageIcon />
            <span>{feedbackMode ? 'Click anywhere...' : 'Leave Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div style={styles.viewportContainer}>
        <div 
          ref={iframeContainerRef}
          style={{ 
            ...styles.deviceFrame,
            width: selectedBreakpoint.width + 'px'
          }}
        >
          {/* Overlay para capturar clicks cuando feedbackMode está activo */}
          {feedbackMode && (
            <div
              ref={overlayRef}
              onClick={handleOverlayClick}
              style={styles.overlay}
            />
          )}

          <iframe
            src={project.framer_url}
            style={styles.iframe}
          />
        </div>

        {/* Comment box flotante */}
        {commentBox && (
          <div
            style={{
              ...styles.commentBox,
              left: commentBox.x + 20 + 'px',
              top: commentBox.y - 100 + 'px'
            }}
          >
            {/* Pin azul */}
            <div style={{
              ...styles.pin,
              left: '-30px',
              top: '100px'
            }} />

            <textarea
              ref={textareaRef}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Comment..."
              style={styles.commentInput}
              rows={3}
              disabled={isSubmitting}
            />

            <div style={styles.commentActions}>
              <button
                onClick={handleCancel}
                style={styles.cancelButton}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim() || isSubmitting}
                style={{
                  ...styles.sendButton,
                  opacity: (!feedbackText.trim() || isSubmitting) ? 0.5 : 1
                }}
              >
                <SendIcon />
                <span>{isSubmitting ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--framer-color-bg, #FAFAFA)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--framer-color-bg, #FAFAFA)'
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(0, 0, 0, 0.1)',
    borderTopColor: 'var(--framer-color-tint, #0099FF)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'var(--framer-color-bg, #FAFAFA)'
  },
  errorTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    color: 'var(--framer-color-text, #000)'
  },
  errorText: {
    fontSize: '13px',
    margin: 0,
    color: 'var(--framer-color-text-secondary, #999)'
  },
  header: {
    backgroundColor: 'var(--framer-color-bg-secondary, #FFF)',
    borderBottom: '1px solid var(--framer-color-divider, #E4E4E4)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0
  },
  headerLeft: {
    flex: 1,
    minWidth: 0
  },
  projectName: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
    color: 'var(--framer-color-text, #000)',
    letterSpacing: '-0.01em'
  },
  headerSubtext: {
    fontSize: '11px',
    margin: '2px 0 0 0',
    color: 'var(--framer-color-text-tertiary, #999)'
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  breakpointSelector: {
    display: 'flex',
    gap: '4px',
    padding: '2px',
    backgroundColor: 'var(--framer-color-bg, #FAFAFA)',
    borderRadius: '6px'
  },
  breakpointButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    color: 'var(--framer-color-text-secondary, #999)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em'
  },
  breakpointButtonActive: {
    backgroundColor: 'var(--framer-color-bg-secondary, #FFF)',
    color: 'var(--framer-color-text, #000)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
  },
  feedbackButton: {
    padding: '6px 12px',
    backgroundColor: 'var(--framer-color-tint, #0099FF)',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em'
  },
  feedbackButtonActive: {
    backgroundColor: 'var(--framer-color-text-secondary, #999)',
    cursor: 'not-allowed'
  },
  viewportContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    overflow: 'auto',
    position: 'relative'
  },
  deviceFrame: {
    position: 'relative',
    height: '600px',  // ← Altura fija para que coincida con screenshot
    backgroundColor: 'var(--framer-color-bg-secondary, #FFF)',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04)',
    borderRadius: '8px',
    overflow: 'hidden',
    flexShrink: 0,  // No permitir que se encoja
    maxWidth: 'none'  // No límite de ancho máximo
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',  // ← Mismo tamaño que el iframe
    zIndex: 10,
    cursor: 'crosshair',
    backgroundColor: 'rgba(0, 153, 255, 0.03)'
  },
  iframe: {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    border: 'none',
    display: 'block'
  },
  commentBox: {
    position: 'fixed',
    backgroundColor: 'var(--framer-color-bg-secondary, #FFF)',
    border: '1px solid var(--framer-color-divider, #E4E4E4)',
    borderRadius: '8px',
    padding: '12px',
    width: '280px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    zIndex: 100
  },
  pin: {
    position: 'absolute',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#0099FF',
    border: '3px solid #FFF',
    boxShadow: '0 2px 8px rgba(0, 153, 255, 0.3)'
  },
  commentInput: {
    width: '100%',
    border: '1px solid var(--framer-color-divider, #E4E4E4)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
    resize: 'none',
    backgroundColor: 'var(--framer-color-bg, #FAFAFA)',
    color: 'var(--framer-color-text, #000)',
    outline: 'none',
    marginBottom: '8px'
  },
  commentActions: {
    display: 'flex',
    gap: '6px'
  },
  cancelButton: {
    flex: 1,
    border: '1px solid var(--framer-color-divider, #E4E4E4)',
    backgroundColor: 'transparent',
    padding: '6px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    color: 'var(--framer-color-text, #000)',
    letterSpacing: '-0.01em'
  },
  sendButton: {
    flex: 1,
    backgroundColor: 'var(--framer-color-tint, #0099FF)',
    color: '#FFF',
    border: 'none',
    padding: '6px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px'
  }
}