"use client"

import { useState } from "react"
import { useRooms } from "@/hooks/useRooms"
import CreateRoomModal from "./create-room-modal"
import JoinRoomModal from "./join-room-modal"
import RoomCard from "./room-card"

interface RoomsViewProps {
  user: { id: number; username: string; role: string };
  rooms: any[];
  onSelectRoom: (room: any) => void;
  onRefresh: () => void;
}

export default function RoomsView({ user, rooms, onSelectRoom, onRefresh }: RoomsViewProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { createRoom, joinRoom, deleteRoom, getRoomByCode } = useRooms();

  const handleCreateRoom = async (name: string, description: string) => {
    await createRoom({ name, description });
    setShowCreateModal(false);
    onRefresh();
  };

  const handleJoinRoom = async (code: string) => {
    try {
      const room = await joinRoom(code);
      setShowJoinModal(false);
      onRefresh();
      // Navigate to the joined room
      onSelectRoom(room);
    } catch (error) {
      // Error is already handled in the modal
      console.error('Error joining room:', error);
    }
  };

  const handleSelectRoom = async (room: any) => {
    try {
      // Obtener el room completo con polls para salas existentes
      const fullRoom = await getRoomByCode(room.code);
      onSelectRoom(fullRoom);
    } catch (error) {
      console.error('Error obteniendo sala completa:', error);
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta sala?")) {
      await deleteRoom(roomId);
      onRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Mis Salas</h2>
            <p className="text-slate-600">Gestiona tus sesiones de votación colaborativa</p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-300 ease-out flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Nueva sala
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex-1 sm:flex-none px-6 py-3 border-2 border-emerald-300 text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50/50 transition-all duration-300 ease-out flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m0 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Unirse
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100/50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium mb-4">No tienes salas aún</p>
            <p className="text-slate-400 mb-6">Crea una nueva sala o únete a una existente</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-300 ease-out flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear sala
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-all duration-300 ease-out flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m0 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Unirse a sala
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isCreator={room.createdBy === user.id}
                onSelect={handleSelectRoom}
                onDelete={() => handleDeleteRoom(room.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateRoomModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateRoom} />

      <JoinRoomModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onSubmit={handleJoinRoom} />
    </div>
  )
}
// app/components/dashboard/rooms-view.tsx

