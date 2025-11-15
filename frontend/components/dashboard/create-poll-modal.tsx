"use client"

import type React from "react"

import { useState } from "react"

interface CreatePollModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, options: string[], duration?: number) => void
}

export default function CreatePollModal({ isOpen, onClose, onSubmit }: CreatePollModalProps) {
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [duration, setDuration] = useState<number | undefined>(undefined)

  const handleAddOption = () => {
    setOptions([...options, ""])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter((opt) => opt.trim())

    if (title.trim() && validOptions.length >= 2) {
      onSubmit(title, validOptions, duration)
      setTitle("")
      setOptions(["", ""])
      setDuration(undefined)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-green-300/50 max-h-screen overflow-y-auto shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Nueva Votación</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Pregunta</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Cuál es tu opinión?"
              className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Duración (opcional)</label>
            <input
              type="number"
              min="1"
              value={duration || ""}
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Minutos"
              className="w-full px-4 py-3 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Opciones</label>
              <span className="text-xs text-slate-500">{options.length}</span>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-white border border-green-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-red-500 hover:bg-red-50/50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              + Agregar opción
            </button>
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
              Crear votación
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
