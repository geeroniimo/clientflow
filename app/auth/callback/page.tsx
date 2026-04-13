'use client'

import { useEffect, useState } from 'react'

/**
 * OAuth callback page.
 * After Google (or any provider) redirects here, the access_token and
 * refresh_token are in the URL hash (implicit flow).
 * We post them back to the plugin popup opener and close this window.
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token') ?? ''
    const error_description = params.get('error_description')

    if (error_description) {
      setStatus('error')
      return
    }

    if (access_token) {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'CF_OAUTH_CALLBACK', access_token, refresh_token },
          '*'
        )
        window.close()
      }
      setStatus('done')
    } else {
      setStatus('error')
    }
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
    }}>
      {status === 'processing' && (
        <>
          <div style={{ fontSize: 32 }}>⏳</div>
          <p style={{ fontSize: 15, margin: 0 }}>Signing you in…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <div style={{ fontSize: 32 }}>✅</div>
          <p style={{ fontSize: 15, margin: 0 }}>Signed in! You can close this window.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: 32 }}>❌</div>
          <p style={{ fontSize: 15, margin: 0 }}>Something went wrong. Please try again.</p>
        </>
      )}
    </div>
  )
}
