'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-600">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold text-white">FamJam</h1>
        <p className="text-xl text-indigo-100">Family Game Night, Anywhere</p>
        {error === 'unauthorized' && (
          <p className="text-red-200 bg-red-500/30 px-4 py-2 rounded-lg">
            This account is not authorized. Contact your family admin.
          </p>
        )}
        <button
          onClick={signInWithGoogle}
          className="bg-white text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
