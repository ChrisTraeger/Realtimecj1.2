"use client"

import { useState, useEffect } from "react"
import { type Room } from "@/lib/storage"
import ChatPanel from "./chat-panel"
import VotingPanel from "./voting-panel"
import MembersPanel from "./members-panel"
import { initSocket, getSocket } from "@/lib/socket"
import { useToast } from "@/hooks/use-toast"
import roomService from "@/lib/api/rooms"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Socket } from "socket.io-client" // ✅ Corregido: Usar "from" no "in"

// --- IMPORT DEL VIDEO ---
import VideoCall from "./VideoCall"

interface RoomDetailProps {
  room: any;
  user: { id: number; username: string; role: string };
  onBack: () => void;
}

export default function RoomDetail({ room, user, onBack }: RoomDetailProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "voting">("chat")
  const [membersExpanded, setMembersExpanded] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<any[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState(room.name)
  const [editDescription, setEditDescription] = useState(room.description || "")
  const { toast } = useToast()
  
  // --- ESTADO PARA EL SOCKET ---
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isClient, setIsClient] = useState(false) // ✅ Para evitar errores de hidratación

  // ✅ Establecer que estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    let socketInstance: Socket;

    if (token) {
      socketInstance = initSocket(token);
      setSocket(socketInstance);

      // Unirse a la sala
      socketInstance.emit('joinRoom', room.code);

      // Escuchar usuarios conectados
      socketInstance.on('roomUsers', (users: any[]) => {
        setConnectedUsers(users);
      });

      // Listener: memberKicked
      socketInstance.on('memberKicked', (data: { kickedUserId: number; kickedBy: string }) => {
        setConnectedUsers(prev => prev.filter(u => u.userId !== data.kickedUserId));
        if (data.kickedUserId === user.id) {
          toast({
            title: "Has sido expulsado",
            description: `Has sido expulsado de la sala por ${data.kickedBy}.`,
            variant: "destructive",
          });
          onBack();
        }
      });

      // Listener: kicked
      socketInstance.on('kicked', (data: { roomCode: string }) => {
        toast({
          title: "Expulsado",
          description: "Has sido expulsado de la sala.",
          variant: "destructive",
        });
        onBack();
      });

      // Limpiar al desmontar
      return () => {
        socketInstance.emit('leaveRoom', room.code);
        socketInstance.off('roomUsers');
        socketInstance.off('memberKicked');
        socketInstance.off('kicked');
      };
    }
  }, [room.code, onBack, toast, user.id]); 

  const handleLeaveRoom = async () => {
    const isCreator = room.creatorId === user.id;
    const confirmMessage = isCreator
      ? "¿Estás seguro de que quieres cerrar esta sala? Esto eliminará la sala para todos los miembros."
      : "¿Estás seguro de que quieres salir de esta sala?";

    if (confirm(confirmMessage)) {
      try {
        if (isCreator) {
          await roomService.closeRoom(room.id);
        } else {
          await roomService.leaveRoom(room.code);
        }
        onBack();
      } catch (error) {
        console.error('Error al salir/cerrar sala:', error);
        alert('Error al procesar la solicitud. Inténtalo de nuevo.');
      }
    }
  }

  const handleRefresh = () => {
    console.log("Evento de refresco recibido");
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      toast({
        title: "Código copiado",
        description: "El código de la sala ha sido copiado al portapapeles.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar el código.",
        variant: "destructive",
      })
    }
  }

  const handleEditRoom = async () => {
    try {
      await roomService.updateRoom(room.code, editName, editDescription)
      toast({
        title: "Sala actualizada",
        description: "La sala ha sido actualizada correctamente.",
      })
      setIsEditDialogOpen(false)
      room.name = editName
      room.description = editDescription
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la sala.",
        variant: "destructive",
      })
    }
  }

  // ✅ Verificación antes de renderizar
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Sala no encontrada</p>
      </div>
    )
  }
  
  // Estado de carga mientras se conecta el socket
  if (!socket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Conectando al servidor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex flex-col">
      {/* Header */}
      <div className="glass-morphism border-b border-green-200/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-300 ease-out"
              title="Volver"
            >
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{room.name}</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500">
                  Código: <code className="font-mono font-bold text-green-600">{room.code}</code>
                </p>
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded transition-all duration-300 ease-out"
                  title="Copiar código"
                >
                  <svg
                    className="w-4 h-4 text-slate-600 dark:text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {room.creatorId === user.id && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50/50 font-medium rounded-lg transition-all duration-300 ease-out flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Editar
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Sala</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre de la sala"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Descripción</label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descripción de la sala"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleEditRoom} className="flex-1">
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 text-red-600 hover:bg-red-50/50 font-medium rounded-lg transition-all duration-300 ease-out flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {room.creatorId === user.id ? "Cerrar sala" : "Salir"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
        {/* Members Panel - Collapsible */}
        <div className="w-full">
          <button
            onClick={() => setMembersExpanded(!membersExpanded)}
            className="w-full glass-morphism border border-green-200/30 rounded-2xl px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-all duration-300 ease-out"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-semibold text-slate-900">
                {connectedUsers.length} {connectedUsers.length === 1 ? "miembro" : "miembros"}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${membersExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {membersExpanded && (
            <div className="mt-3 animate-in fade-in duration-300">
              <MembersPanel members={connectedUsers} room={room} user={user} socket={socket} />
            </div>
          )}
        </div>

        {/* --- ÁREA DE VIDEO --- */}
        <div className="glass-morphism border border-green-200/30 rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-semibold mb-3 text-slate-800">Videollamada</h3>
          <VideoCall socket={socket} roomId={room.id} />
        </div>
        {/* --- FIN DE ÁREA DE VIDEO --- */}

        {/* Tabs for Chat and Voting */}
        <div className="w-full flex-1 flex flex-col">
          <div className="flex gap-2 border-b border-green-200/30 mb-6">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-3 font-medium transition-all duration-300 ease-out relative ${
                activeTab === "chat" ? "text-green-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Chat
              {activeTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
            </button>
            <button
              onClick={() => setActiveTab("voting")}
              className={`px-6 py-3 font-medium transition-all duration-300 ease-out relative ${
                activeTab === "voting" ? "text-green-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Votaciones
              {activeTab === "voting" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === "chat" && (
              <div className="animate-in fade-in duration-300">
                <ChatPanel room={room} user={user} onMessageAdded={handleRefresh} socket={socket} />
              </div>
            )}
            {activeTab === "voting" && (
              <div className="animate-in fade-in duration-300">
                <VotingPanel
                  room={room}
                  user={user}
                  socket={socket} 
                  onPollCreated={handleRefresh}
                  onVoted={handleRefresh}
                  onPollDeleted={handleRefresh}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}