export default function Home() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      backgroundColor: '#fafafa',
      color: '#09090b',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: 'rgba(124,58,237,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <path d="M6 21l6 6 10-13M20 21l6 6 10-13" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: '#7C3AED' }}>
          ClientFlow
        </span>
      </div>
      <p style={{ fontSize: 14, color: '#71717a', margin: 0 }}>
        API server — nothing to see here.
      </p>
    </div>
  )
}
