"use client"

import { useState, useEffect } from "react"
import CreatePollModal from "./create-poll-modal"
import PollCard from "./poll-card"
import { useToast } from "@/hooks/use-toast"
import { Socket } from "socket.io-client" // <-- IMPORTAR

interface VotingPanelProps {
  room: any;
  user: { id: number; username: string; role: string };
  onPollCreated: () => void;
  onVoted: () => void;
  onPollDeleted: () => void;
  socket: Socket; // <-- AÑADIR PROP
}

export default function VotingPanel({ 
  room, 
  user, 
  onPollCreated, 
  onVoted, 
  onPollDeleted, 
  socket // <-- RECIBIR PROP
}: VotingPanelProps) {
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [polls, setPolls] = useState<any[]>(room.polls || [])
  const { toast } = useToast()

  useEffect(() => {
    setPolls(room.polls || [])
  }, [room.polls])

  useEffect(() => {
    // Usar el socket de las props
    
    // Escuchar nuevas votaciones
    socket.on('newPoll', (poll: any) => {
      console.log('Nueva votación recibida:', poll);
      setPolls(prev => {
        const filtered = prev.filter(p => !p.id.toString().startsWith('temp-'));
        return [...filtered, poll];
      });
    });

    // Escuchar resultados de votaciones
    socket.on('pollResults', (results: any) => {
      console.log('Resultados de votación recibidos:', results);
      setPolls(prev => prev.map(p => p.id === results.id ? { ...p, ...results } : p));
    });

    // Escuchar cierre de votaciones
    socket.on('pollClosed', (data: { pollId: number, autoClosed?: boolean }) => {
      console.log('Votación cerrada:', data.pollId, data.autoClosed ? '(automáticamente)' : '');
      setPolls(prev => prev.map(p => p.id === data.pollId ? { ...p, isOpen: false } : p));
    });

    socket.on('pollExpired', (data: { pollId: number, message: string }) => {
      console.log('Encuesta expirada:', data.message);
      toast({
        title: "⏰ Votación Cerrada",
        description: data.message,
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Votación Cerrada', { body: data.message });
      }
    });

    socket.on('pollDeleted', (data: { pollId: number }) => {
      console.log('Votación eliminada:', data.pollId);
      setPolls(prev => prev.filter(p => p.id !== data.pollId));
      toast({
        title: "🗑️ Votación Eliminada",
        description: "La votación ha sido eliminada permanentemente.",
        variant: "default",
      });
    });

    socket.on('pollExpiringSoon', (data: { pollId: number, message: string }) => {
      console.log('Encuesta expirando pronto:', data.message);
      toast({
        title: "⚠️ Votación por Cerrar",
        description: data.message,
        variant: "default",
      });
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Votación por Cerrar', { body: data.message });
      }
    });

    // Limpiar al desmontar
    return () => {
      socket.off('newPoll');
      socket.off('pollResults');
      socket.off('pollClosed');
      socket.off('pollExpired');
      socket.off('pollExpiringSoon');
    };
  }, [socket, toast]); // <-- AÑADIR SOCKET Y TOAST A DEPENDENCIAS

  // Solicitar permiso para notificaciones
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCreatePoll = async (question: string, options: string[], duration?: number) => {
    try {
      // Usar el socket de las props
      const deadline = duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : undefined;
      socket.emit('createPoll', { roomCode: room.code, question, options, roomId: room.id, deadline });
      setShowCreatePoll(false);
      // Actualización optimista
      const tempPoll = {
        id: `temp-${Date.now()}`,
        question,
        options: options.map((opt, index) => ({ id: `temp-opt-${index}`, text: opt, votes: [] })),
        isOpen: true
      };
      setPolls(prev => [...prev, tempPoll]);
    } catch (err) {
      console.error('Error creando votación:', err);
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    try {
      // Usar el socket de las props
      socket.emit('submitVote', { roomCode: room.code, pollId, optionId });
    } catch (err) {
      console.error('Error votando:', err);
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    if (confirm("¿Eliminar permanentemente esta votación? Esta acción no se puede deshacer.")) {
      try {
        // Usar el socket de las props
        socket.emit('deletePoll', { roomCode: room.code, pollId });
      } catch (err) {
        console.error('Error eliminando votación:', err);
      }
    }
  };

  const handleClosePoll = async (pollId: number) => {
    if (confirm("¿Cerrar esta votación? Ya no se podrán emitir más votos.")) {
      try {
        // Usar el socket de las props
        socket.emit('closePoll', { roomCode: room.code, pollId });
      } catch (err) {
        console.error('Error cerrando votación:', err);
      }
    }
  };

  return (
    <>
      <div className="glass-morphism rounded-2xl border border-amber-200/30 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-200/30 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
            Votaciones
          </h2>
          {room.creatorId === user.id && (
            <button
              onClick={() => setShowCreatePoll(true)}
              className="px-3 py-1 text-sm bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-lg transition-all duration-300 ease-out"
            >
              + Nueva votación
            </button>
          )}
        </div>

        {/* Polls */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {polls && polls.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <p className="text-sm">No hay votaciones aún</p>
            </div>
          ) : (
            polls.map((poll: any) => (
              <PollCard
                key={poll.id}
                poll={poll}
                userId={user.id.toString()}
                onVote={(optionId: string) => handleVote(Number(poll.id), Number(optionId))}
                onDelete={() => handleDeletePoll(Number(poll.id))}
                onClose={() => handleClosePoll(Number(poll.id))}
                isCreator={room.creatorId === user.id}
              />
            ))
          )}
        </div>
      </div>

      <CreatePollModal isOpen={showCreatePoll} onClose={() => setShowCreatePoll(false)} onSubmit={handleCreatePoll} />
    </>
  )
}