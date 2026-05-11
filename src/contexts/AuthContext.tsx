'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'super_admin' | 'manager' | 'shareholder'

type Profile = {
  id: string
  role: Role
  display_name: string | null
  title: string | null
}

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(u: User) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, role, display_name, title')
      .eq('id', u.id)
      .single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    // getSession reads from localStorage (instant), avoids a network round-trip on every load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadProfile(u)  // await so profile is ready before loading=false
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
