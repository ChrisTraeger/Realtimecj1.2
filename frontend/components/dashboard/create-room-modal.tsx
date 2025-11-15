"use client"

import type React from "react"

import { useState } from "react"

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, description: string) => void
}

export default function CreateRoomModal({ isOpen, onClose, onSubmit }: CreateRoomModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name, description)
      setName("")
      setDescription("")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-green-300/50 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Nueva Sala</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la sala</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Decisión del proyecto"
              className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de esta sala..."
              className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 hover:bg-slate-100/50 rounded-lg font-medium transition-all duration-300 ease-out"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-300 ease-out"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
