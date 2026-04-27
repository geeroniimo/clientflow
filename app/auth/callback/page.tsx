'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * OAuth callback page.
 * Tokens arrive in the URL hash (implicit flow).
 * We save them to the `pending_auth` Supabase table so the plugin
 * can poll and pick them up — needed because window.opener is null
 * when Framer (Electron) opens the popup in the system browser.
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token') ?? ''
    const error_description = params.get('error_description')

    const queryParams = new URLSearchParams(window.location.search)
    const state = queryParams.get('state')

    if (error_description) {
      setErrorMsg(error_description)
      setStatus('error')
      return
    }

    if (!access_token) {
      setErrorMsg('No access token received.')
      setStatus('error')
      return
    }

    const save = async () => {
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: 'CF_OAUTH_CALLBACK', access_token, refresh_token },
            'https://clientflow.design'
          )
          window.close()
          setStatus('done')
          return
        } catch (_) {
          // Fall through to server-side relay
        }
      }

      if (state) {
        const { error } = await supabase.from('pending_auth').upsert({
          state,
          access_token,
          refresh_token,
        })
        if (error) {
          setErrorMsg('Failed to relay session: ' + error.message)
          setStatus('error')
          return
        }
      }

      setStatus('done')
    }

    save()
  }, [])

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #f5f5f7;
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        @media (prefers-color-scheme: dark) {
          body { background: #0a0a0a; }
          .cf-card { background: #141414 !important; border-color: rgba(255,255,255,0.08) !important; }
          .cf-title { color: #f5f5f5 !important; }
          .cf-sub { color: #71717a !important; }
          .cf-brand { color: #f5f5f5 !important; }
          .cf-footer { color: #3f3f46 !important; }
          .cf-btn-secondary { border-color: rgba(255,255,255,0.12) !important; color: #71717a !important; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>

        <div className="cf-card" style={{
          width: '100%',
          maxWidth: 330,
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 20,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        }}>

          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: 'rgba(124,58,237,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                <path d="M6 21l6 6 10-13M20 21l6 6 10-13" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="cf-brand" style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.3px',
              color: '#7C3AED',
            }}>
              Clientflow
            </span>
          </div>

          {status === 'processing' && <ProcessingState />}
          {status === 'done'       && <DoneState />}
          {status === 'error'      && <ErrorState message={errorMsg} />}

        </div>

        <p className="cf-footer" style={{
          marginTop: 20,
          fontSize: 11,
          color: '#a1a1aa',
          letterSpacing: '0.1px',
        }}>
          Secured by Supabase Auth
        </p>
      </div>
    </>
  )
}

/* ── States ─────────────────────────────────────────────────────────────────── */

function ProcessingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
      {/* Icon */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ animation: 'spin 0.9s linear infinite' }}
        >
          <circle cx="12" cy="12" r="10" stroke="rgba(124,58,237,0.2)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Text */}
      <h1 className="cf-title" style={headingStyle}>
        Signing you in…
      </h1>
      <p className="cf-sub" style={subStyle}>
        Completing authentication with Google.
      </p>
    </div>
  )
}

function DoneState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
      {/* Text */}
      <h1 className="cf-title" style={headingStyle}>
        You're signed in
      </h1>
      <p className="cf-sub" style={subStyle}>
        Return to the plugin — you can close this window.
      </p>

      {/* CTA */}
      <button
        onClick={() => window.close()}
        style={doneBtnStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#9061f9')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#a78bfa')}
      >
        Close window
      </button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
      {/* Icon */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: 'rgba(239,68,68,0.07)',
        border: '1px solid rgba(239,68,68,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Text */}
      <h1 className="cf-title" style={headingStyle}>
        Something went wrong
      </h1>
      <p className="cf-sub" style={subStyle}>
        {message || 'Please close this window and try again.'}
      </p>

      {/* CTA */}
      <button
        className="cf-btn-secondary"
        onClick={() => window.close()}
        style={secondaryBtnStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Close and try again
      </button>
    </div>
  )
}

/* ── Shared style tokens ─────────────────────────────────────────────────────── */

const headingStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: '32px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
  color: '#09090b',
  textAlign: 'center',
  marginBottom: 8,
}

const subStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: '24px',
  letterSpacing: '-0.2px',
  color: '#71717a',
  textAlign: 'center',
  maxWidth: 240,
  textWrap: 'balance' as 'balance',
  marginBottom: 24,
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#7C3AED',
  color: '#ffffff',
  border: 'none',
  borderRadius: 14,
  fontSize: 16,
  lineHeight: '24px',
  fontWeight: 600,
  letterSpacing: '-0.4px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
}

const doneBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: '#a78bfa',
  color: '#ffffff',
  border: 'none',
  borderRadius: 14,
  fontSize: 16,
  lineHeight: '24px',
  fontWeight: 600,
  letterSpacing: '-0.4px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
}

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  backgroundColor: 'transparent',
  color: '#71717a',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 14,
  fontSize: 14,
  lineHeight: '24px',
  fontWeight: 500,
  letterSpacing: '-0.3px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
}
