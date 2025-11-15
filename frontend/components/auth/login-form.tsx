"use client"

import type React from "react"

import { useState } from "react"
import authService from "@/lib/api/auth"
import { useAuth } from "@/lib/contexts/auth-context"

interface LoginFormProps {
  onToggle: () => void;
}

export default function LoginForm({ onToggle }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ username, password });
    } catch (err) {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-6 rounded-2xl space-y-4 border border-green-300/50 shadow-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu usuario"
            className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-slate-400"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50/80 border border-red-200/50 rounded-lg text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-300 ease-out disabled:opacity-50"
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </div>

      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <button type="button" onClick={onToggle} className="text-green-600 font-medium hover:text-green-700">
          Regístrate aquí
        </button>
      </p>
    </form>
  );
}
