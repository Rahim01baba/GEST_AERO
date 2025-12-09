import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!user) return <>{children}</>

  const canViewAirports = user.role === 'ADMIN' || user.role === 'DED-C'
  const canViewUsers = user.role === 'ADMIN'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
            Airport Manager
          </h1>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/dashboard" style={linkStyle}>Tableau de bord</Link>
            <Link to="/movements" style={linkStyle}>Mouvements</Link>
            <Link to="/parking" style={linkStyle}>Parking</Link>
            <Link to="/billing" style={linkStyle}>Facturation</Link>
            <Link to="/aircrafts" style={linkStyle}>Aéronefs</Link>
            {canViewAirports && <Link to="/airports" style={linkStyle}>Aéroports</Link>}
            {canViewUsers && <Link to="/users" style={linkStyle}>Utilisateurs</Link>}
            {canViewUsers && <Link to="/billing-settings" style={linkStyle}>⚙️ Facturation</Link>}
            <Link to="/audit" style={linkStyle}>Audit</Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {user.full_name} ({user.role})
          </span>
          <button onClick={handleSignOut} style={buttonStyle}>
            Déconnexion
          </button>
        </div>
      </nav>
      <main style={{ padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 500,
  padding: '8px 12px',
  borderRadius: '6px',
  transition: 'background-color 0.2s',
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
}
