'use client'

export default function CheckoutSuccess() {
  return (
    <>
      <style>{`
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
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="#7C3AED"/>
              <path d="M12 20.5l6 6 10-12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="cf-brand" style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.3px',
              color: '#09090b',
            }}>
              ClientFlow
            </span>
          </div>

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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l5 5 9-9" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Text */}
          <h1 className="cf-title" style={{
            fontSize: 24,
            lineHeight: '32px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: '#09090b',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            You're on Pro
          </h1>
          <p className="cf-sub" style={{
            fontSize: 16,
            lineHeight: '24px',
            letterSpacing: '-0.2px',
            color: '#71717a',
            textAlign: 'center',
            maxWidth: 240,
            marginBottom: 24,
          }}>
            Your subscription is active. You can close this tab and return to the plugin.
          </p>

          {/* CTA */}
          <button
            onClick={() => window.close()}
            style={{
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
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6D28D9')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7C3AED')}
          >
            Close tab
          </button>
        </div>

        <p className="cf-footer" style={{
          marginTop: 20,
          fontSize: 11,
          color: '#a1a1aa',
          letterSpacing: '0.1px',
        }}>
          Secured by Polar
        </p>
      </div>
    </>
  )
}
