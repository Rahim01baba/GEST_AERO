import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User } from './supabase'
import { getUserRole, can, getAirportIdForUser, canViewAllAirports, UserRole, Action } from './permissions'

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  can: (action: Action) => boolean
  canViewAllAirports: () => boolean
  getAssignedAirportId: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          setUser(data)
          if (data?.email) {
            setUserRole(getUserRole(data.email))
          }
        }
        setLoading(false)
      })()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          setUser(data)
          if (data?.email) {
            setUserRole(getUserRole(data.email))
          }
        } else {
          setUser(null)
          setUserRole(null)
        }
        setLoading(false)
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
  }

  const canPerformAction = (action: Action): boolean => {
    if (!userRole) return false
    return can(action, userRole)
  }

  const canViewAll = (): boolean => {
    if (!userRole) return false
    return canViewAllAirports(userRole)
  }

  const getAssignedAirportId = async (): Promise<string | null> => {
    if (!user?.email) return null
    return getAirportIdForUser(user.email)
  }

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      signIn,
      signOut,
      can: canPerformAction,
      canViewAllAirports: canViewAll,
      getAssignedAirportId
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
