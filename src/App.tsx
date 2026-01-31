import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Movements } from './pages/Movements'
import { Parking } from './pages/Parking'
import { BillingNew } from './pages/BillingNew'
import { BillingEditor } from './pages/BillingEditor'
import { Aircrafts } from './pages/Aircrafts'
import { AircraftEditor } from './pages/AircraftEditor'
import { Airports } from './pages/Airports'
import { AirportEditor } from './pages/AirportEditor'
import { UsersNew } from './pages/UsersNew'
import { Audit } from './pages/Audit'
import { BillingSettings } from './pages/BillingSettings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
      <Route path="/parking" element={<ProtectedRoute><Parking /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><BillingNew /></ProtectedRoute>} />
      <Route path="/billing/new" element={<ProtectedRoute><BillingEditor mode="create" /></ProtectedRoute>} />
      <Route path="/billing/:id" element={<ProtectedRoute><BillingEditor mode="edit" /></ProtectedRoute>} />
      <Route path="/aircrafts" element={<ProtectedRoute><Aircrafts /></ProtectedRoute>} />
      <Route path="/aircrafts/new" element={<ProtectedRoute><AircraftEditor mode="create" /></ProtectedRoute>} />
      <Route path="/aircrafts/:id" element={<ProtectedRoute><AircraftEditor mode="edit" /></ProtectedRoute>} />
      <Route path="/airports" element={<ProtectedRoute><Airports /></ProtectedRoute>} />
      <Route path="/airports/new" element={<ProtectedRoute><AirportEditor /></ProtectedRoute>} />
      <Route path="/airports/:id" element={<ProtectedRoute><AirportEditor /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersNew /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
      <Route path="/billing-settings" element={<ProtectedRoute><BillingSettings /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
