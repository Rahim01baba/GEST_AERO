import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast, ToastComponent } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caracteres', 'error')
      return
    }
    if (password !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      showToast(error.message || 'Impossible de definir le mot de passe', 'error')
    } else {
      showToast('Mot de passe defini avec succes', 'success')
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600, color: '#1a1a1a' }}>
          Definir un mot de passe
        </h1>
        <p style={{ margin: '0 0 32px 0', color: '#666', fontSize: '14px' }}>
          Choisissez un mot de passe pour votre compte
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
              placeholder="********"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#93c5fd' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Enregistrement...' : 'Definir le mot de passe'}
          </button>
        </form>
      </div>
      {ToastComponent}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#1a1a1a'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
}
