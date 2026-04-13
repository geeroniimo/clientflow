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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#111',
      gap: 12,
      padding: 24,
      textAlign: 'center',
    }}>
      {status === 'processing' && (
        <>
          <div style={{ fontSize: 32 }}>⏳</div>
          <p style={{ fontSize: 15, margin: 0 }}>Signing you in…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Signed in!</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            You can close this window and return to the plugin.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 32 }}>❌</div>
          <p style={{ fontSize: 15, margin: 0 }}>Something went wrong.</p>
          {errorMsg && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{errorMsg}</p>}
        </>
      )}
    </div>
  )
}
