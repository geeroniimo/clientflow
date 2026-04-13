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

    // Also check for state param in the query string (passed from plugin)
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
      // First try window.opener (works in browser-based plugins)
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: 'CF_OAUTH_CALLBACK', access_token, refresh_token },
            '*'
          )
          window.close()
          setStatus('done')
          return
        } catch (_) {
          // Fall through to server-side relay
        }
      }

      // Server-side relay: save to pending_auth table so the plugin can poll
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

  const states = {
    processing: {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ),
      iconBg: 'rgba(124,58,237,0.08)',
      iconBorder: 'rgba(124,58,237,0.15)',
      title: 'Signing you in…',
      subtitle: 'Completing authentication with Google.',
    },
    done: {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.3)" strokeWidth="1.5"/>
          <path d="M7.5 12l3 3 6-6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      iconBg: 'rgba(34,197,94,0.08)',
      iconBorder: 'rgba(34,197,94,0.2)',
      title: 'You\'re signed in',
      subtitle: 'Return to the plugin — you can close this window.',
    },
    error: {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.25)" strokeWidth="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      iconBg: 'rgba(239,68,68,0.07)',
      iconBorder: 'rgba(239,68,68,0.18)',
      title: 'Something went wrong',
      subtitle: errorMsg || 'Please close this window and try again.',
    },
  }

  const s = states[status]

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafafa; }
        @media (prefers-color-scheme: dark) { body { background: #0f0f0f; } .card { background: #1a1a1a !important; border-color: #2a2a2a !important; } .title { color: #f5f5f5 !important; } .sub { color: #71717a !important; } .brand { color: #f5f5f5 !important; } }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '24px 20px',
        backgroundColor: '#fafafa',
      }}>

        {/* Card */}
        <div className="card" style={{
          width: '100%',
          maxWidth: 340,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#7C3AED"/>
              <path d="M12 20.5l6 6 10-12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="brand" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: '#111' }}>
              ClientFlow
            </span>
          </div>

          {/* Status icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: s.iconBg,
            border: `1px solid ${s.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            {s.icon}
          </div>

          {/* Text */}
          <h1 className="title" style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#111',
            letterSpacing: '-0.3px',
            marginBottom: 6,
            textAlign: 'center',
          }}>
            {s.title}
          </h1>
          <p className="sub" style={{
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.55,
            textAlign: 'center',
            maxWidth: 240,
          }}>
            {s.subtitle}
          </p>

          {/* Done: close button */}
          {status === 'done' && (
            <button
              onClick={() => window.close()}
              style={{
                marginTop: 24,
                padding: '9px 20px',
                backgroundColor: '#7C3AED',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.1px',
              }}
            >
              Close window
            </button>
          )}

          {/* Error: retry hint */}
          {status === 'error' && (
            <button
              onClick={() => window.close()}
              style={{
                marginTop: 24,
                padding: '9px 20px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Close and try again
            </button>
          )}
        </div>

        {/* Footer */}
        <p style={{ marginTop: 20, fontSize: 11, color: '#9ca3af', letterSpacing: '0.1px' }}>
          Secured by Supabase Auth
        </p>
      </div>
    </>
  )
}
