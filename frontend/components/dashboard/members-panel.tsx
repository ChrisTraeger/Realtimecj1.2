"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Socket } from "socket.io-client" // <-- IMPORTAR

interface MembersPanelProps {
  members: any[]
  room: any
  user: { id: number; username: string; role: string }
  socket: Socket // <-- AÑADIR PROP
}

export default function MembersPanel({ members, room, user, socket }: MembersPanelProps) { // <-- RECIBIR PROP
  const [kickingUserId, setKickingUserId] = useState<number | null>(null)
  const { toast } = useToast()

  const handleKickMember = async (userIdToKick: number, username: string) => {
    if (!confirm(`¿Estás seguro de que quieres expulsar a ${username} de la sala?`)) {
      return
    }

    setKickingUserId(userIdToKick)
    try {
      // Usar el socket de las props, no getSocket()
      socket.emit('kickMember', { roomCode: room.code, userIdToKick })

      toast({
        title: "Miembro expulsado",
        description: `${username} ha sido expulsado de la sala.`,
      })
    } catch (error) {
      console.error('Error al expulsar miembro:', error)
      toast({
        title: "Error",
        description: "No se pudo expulsar al miembro. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setKickingUserId(null)
    }
  }

  const memberDetails = members

  return (
    <div className="glass-morphism rounded-2xl border border-amber-200/30 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-amber-200/30">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
          Miembros ({members.length})
        </h2>
        <p className="text-xs text-slate-500 mt-1">Usa @username en el chat para mencionar</p>
      </div>

      {/* Members List */}
      <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
        {memberDetails.map((member, idx) => {
          const username = typeof member === 'string' ? member : member.username;
          const userId = typeof member === 'string' ? null : member.userId;
          const isCurrentUser = userId === user.id;
          const isAdmin = room.creatorId === user.id;
          const canKick = isAdmin && !isCurrentUser;

          return (
            <div
              key={typeof member === 'string' ? member : member.username || idx}
              className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-amber-200/30 hover:bg-white/80 transition-all duration-300 ease-out"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  if (username) {
                    navigator.clipboard.writeText(`@${username}`);
                  }
                }}
                title="Haz clic para copiar @username"
              >
                <p className="font-medium text-slate-900 text-sm">
                  {username || JSON.stringify(member)}
                  {isCurrentUser && <span className="text-xs text-slate-500 ml-2">(tú)</span>}
                </p>
              </div>

              {canKick && (
                <button
                  onClick={() => handleKickMember(userId, username)}
                  disabled={kickingUserId === userId}
                  className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200 disabled:opacity-50"
                  title={`Expulsar a ${username}`}
                >
                  {kickingUserId === userId ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}