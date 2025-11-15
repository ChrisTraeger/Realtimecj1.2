"use client"

"use client"
import { useAuth } from "@/lib/contexts/auth-context"
import AuthPage from "@/components/auth/auth-page"
import Dashboard from "@/components/dashboard/dashboard"

export default function Home() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-400 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-emerald-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated && user ? (
    <Dashboard
      user={{
        id: Number(user.id),
        username: user.username,
        role: user.role
      }}
      onLogout={logout}
    />
  ) : (
    <AuthPage onLogin={function (user: { id: string; name: string; email: string }): void {
        throw new Error("Function not implemented.")
      } } />
  );
}
