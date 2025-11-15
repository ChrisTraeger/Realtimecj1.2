"use client"

import type { Room } from "@/lib/storage"

interface RoomCardProps {
  room: Room
  isCreator: boolean
  onSelect: (room: Room) => void
  onDelete: () => void
}

export default function RoomCard({ room, isCreator, onSelect, onDelete }: RoomCardProps) {
  const members = Array.isArray(room.members) ? room.members : [];
  return (
    <div className="group glass-morphism p-6 rounded-2xl hover:shadow-lg transition-all duration-300 ease-out cursor-pointer border border-emerald-200/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-all duration-300 ease-out">
            {room.name}
          </h3>
          <p className="text-sm text-slate-600">{room.description}</p>
        </div>
        {isCreator && (
          <div className="px-2 py-1 bg-emerald-100/60 rounded-full">
            <span className="text-xs font-medium text-emerald-700">Creador</span>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Código:</span>
          <code className="font-mono font-bold text-emerald-600 bg-emerald-50/50 px-3 py-1 rounded">{room.code}</code>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Miembros:</span>
          <span className="font-medium text-slate-900">{members.length}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSelect(room)}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-lg transition-all duration-300 ease-out"
        >
          Entrar
        </button>
        {isCreator && (
          <button
            onClick={onDelete}
            className="px-3 py-2 text-red-600 hover:bg-red-50/50 text-sm font-medium rounded-lg transition-all duration-300 ease-out"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
