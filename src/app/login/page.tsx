'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

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
