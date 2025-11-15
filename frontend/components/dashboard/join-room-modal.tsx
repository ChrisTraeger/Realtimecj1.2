"use client"

import type React from "react"

import { useState } from "react"
import { useRooms } from "@/hooks/useRooms"

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (code: string) => void
}

export default function JoinRoomModal({ isOpen, onClose, onSubmit }: JoinRoomModalProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const { getRoomByCode } = useRooms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Ingresa un código de sala válido");
      return;
    }

    try {
      await onSubmit(code.toUpperCase());
      setCode("");
      setError("");
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("La sala no existe. Verifica el código");
      } else if (err.response?.status === 400) {
        setError("La sala ya no está activa");
      } else {
        setError("Error al unirse a la sala. Inténtalo de nuevo");
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-emerald-300">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Unirse a Sala</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Código de acceso</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: A1B2C3"
              maxLength={6}
              className="w-full px-4 py-3 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center font-mono text-lg tracking-widest"
              autoFocus
            />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose()
                setCode("")
                setError("")
              }}
              className="flex-1 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-all duration-300 ease-out"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all duration-300 ease-out"
            >
              Unirse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
