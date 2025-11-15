"use client"

import { useState } from "react"
import LoginForm from "./login-form"
import SignupForm from "./signup-form"

interface AuthPageProps {
  onLogin: (user: { id: string; name: string; email: string }) => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">✓</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Votar</h1>
            <p className="text-slate-500 text-sm">Decisiones colaborativas en tiempo real</p>
          </div>

          {isLogin ? (
            <LoginForm onLogin={onLogin} onToggle={() => setIsLogin(false)} />
          ) : (
            <SignupForm
              onSignup={(user) => {
                onLogin(user)
              }}
              onToggle={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
