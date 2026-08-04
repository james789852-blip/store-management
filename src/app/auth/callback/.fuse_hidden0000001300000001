'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('驗證中...')

  useEffect(() => {
    async function handle() {
      // Handle hash fragment tokens (Supabase invite implicit flow)
      const hash = window.location.hash.slice(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error) {
            window.location.href = '/profile'
            return
          }
        }
      }

      // Handle PKCE code
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          window.location.href = '/profile'
          return
        }
      }

      // Already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/profile'
        return
      }

      setMessage('連結無效或已過期，請聯絡管理員重新邀請')
    }

    handle()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
