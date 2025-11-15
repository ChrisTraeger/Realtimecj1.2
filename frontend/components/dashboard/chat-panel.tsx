"use client"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import chatService from "@/lib/api/chat"
import { Socket } from "socket.io-client" // <-- IMPORTAR

interface ChatPanelProps {
  room: any;
  user: { id: number; username: string; role: string };
  onMessageAdded: () => void;
  socket: Socket; // <-- AÑADIR PROP
}

export default function ChatPanel({ room, user, onMessageAdded, socket }: ChatPanelProps) { // <-- RECIBIR PROP
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Usar el socket de las props, no getSocket()
    
    // Escuchar nuevos mensajes
    socket.on('newRoomMessage', (msg: any) => {
      console.log('Nuevo mensaje recibido:', msg);
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });

    // Escuchar notificaciones de menciones
    socket.on('mentionNotification', (notification: any) => {
      console.log('Notificación de mención recibida:', notification);
      if (notification.fromUser !== user.username) {
        alert(`¡${notification.fromUser} te mencionó en ${notification.roomName}!`);
      }
    });

    // Escuchar notificaciones de votaciones cerradas
    socket.on('pollExpired', (notification: any) => {
      console.log('Notificación de votación cerrada recibida:', notification);
      if (notification.message) {
        alert(notification.message);
      }
    });

    // Cargar mensajes iniciales
    const loadMessages = async () => {
      try {
        const msgs = await chatService.getRoomMessages(room.id);
        console.log('Mensajes cargados:', msgs);
        setMessages(msgs);
      } catch (err) {
        console.error('Error cargando mensajes:', err);
      }
    };
    loadMessages();

    // Limpiar al desmontar
    return () => {
      socket.off('newRoomMessage');
      socket.off('mentionNotification');
      socket.off('pollExpired');
    };
  }, [room.id, socket, user.username]) // <-- AÑADIR SOCKET A DEPENDENCIAS

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        // Usar el socket de las props
        console.log('Enviando mensaje:', { roomCode: room.code, content: message, roomId: room.id });
        socket.emit('roomMessage', { roomCode: room.code, content: message, roomId: room.id });
        setMessage("");
      } catch (err) {
        console.error('Error enviando mensaje:', err);
      }
    }
  }

  const renderMessageContent = (content: string) => {
    // Tu función de renderizado de menciones
    const mentionRegex = /(@\w+)/g;
    const parts = content.split(mentionRegex);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="glass-morphism rounded-2xl border border-emerald-200/30 overflow-hidden flex flex-col h-96">
      {/* Header */}
      <div className="px-6 py-4 border-b border-emerald-200/30">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          Chat en Vivo
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No hay mensajes aún. ¡Inicia la conversación!</p>
          </div>
        ) : (
          <>
            {messages.map((msg: any) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-emerald-600">
                    {msg.username}
                    {msg.username === user.username && <span className="ml-1 text-xs text-slate-400">(tú)</span>}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 break-words">
                  {renderMessageContent(msg.content)}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-emerald-200/30 bg-white/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje... Usa @username para mencionar"
            className="flex-1 px-3 py-2 bg-white/80 border border-green-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
          <button
            type="submit"
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-300 ease-out flex items-center justify-center"
            title="Enviar mensaje"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}