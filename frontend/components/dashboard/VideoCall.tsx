'use client'; 
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Smile } from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VideoCallProps {
  socket: any;
  roomId: string;
}

interface Reaction {
  id: number;
  emoji: string;
  x: number;
  y: number;
  userId?: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId }) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);

  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peersSpeaking, setPeersSpeaking] = useState<Set<string>>(new Set());

  // Estados para reacciones
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  // Emojis disponibles
  const emojiOptions = ['❤️', '👍', '😂', '😢', '🎉', '🔥', '👏', '⭐'];

  // Función para enviar reacción
  const sendReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const newReaction: Reaction = {
      id,
      emoji,
      x: Math.random() * 80 + 10,
      y: 100,
    };

    setReactions(prev => [...prev, newReaction]);

    // Enviar reacción a otros usuarios vía socket
    if (socket) {
      socket.emit('emoji-reaction', {
        roomId,
        emoji,
        timestamp: Date.now(),
      });
    }

    // Remover después de la animación
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  // Escuchar reacciones de otros usuarios
  useEffect(() => {
    if (!socket) return;

    socket.on('emoji-reaction', (data: { emoji: string; userId: string }) => {
      const id = Date.now() + Math.random();
      const newReaction: Reaction = {
        id,
        emoji: data.emoji,
        x: Math.random() * 80 + 10,
        y: 100,
        userId: data.userId,
      };

      setReactions(prev => [...prev, newReaction]);

      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });

    return () => {
      socket.off('emoji-reaction');
    };
  }, [socket]);

  // Atajos de teclado para reacciones
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        sendReaction(emojiOptions[num - 1]);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        
        const audioContext = new AudioContext();
        const audioSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioSource.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const detectSound = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setIsSpeaking(average > 30);
          requestAnimationFrame(detectSound);
        };
        
        detectSound();

        // NUEVO: Unirse a la sala de video cuando el stream esté listo
        if (socket && roomId) {
          socket.emit('join-video-room', roomId);
          console.log('Uniéndose a la sala de video:', roomId);
        }
      })
      .catch(err => console.error("Error al obtener media:", err));
  }, [socket, roomId]); 

  useEffect(() => {
    if (!socket || !myStreamRef.current) return;

    const createPeerConnection = (peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            targetPeerId: peerId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setPeerStreams(prev => new Map(prev).set(peerId, stream));
        
        const audioContext = new AudioContext();
        const audioSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioSource.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const detectPeerSound = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          setPeersSpeaking(prev => {
            const newSet = new Set(prev);
            if (average > 30) {
              newSet.add(peerId);
            } else {
              newSet.delete(peerId);
            }
            return newSet;
          });
          
          requestAnimationFrame(detectPeerSound);
        };
        
        detectPeerSound();
      };

      myStreamRef.current?.getTracks().forEach(track => {
        pc.addTrack(track, myStreamRef.current!);
      });

      setPeerConnections(prev => new Map(prev).set(peerId, pc));
      return pc;
    };

    // NUEVO: Manejar usuarios existentes cuando te unes
    socket.on('existing-users', (userIds: string[]) => {
      console.log('Usuarios existentes en la sala:', userIds);
      userIds.forEach(userId => {
        const pc = createPeerConnection(userId);
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc-offer', {
              targetPeerId: userId,
              offer: pc.localDescription,
            });
          });
      });
    });

    socket.on('webrtc-user-joined', (peerId: string) => {
      console.log('Nuevo usuario se unió:', peerId);
      const pc = createPeerConnection(peerId);
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc-offer', {
            targetPeerId: peerId,
            offer: pc.localDescription,
          });
        });
    });

    socket.on('webrtc-offer', (payload: { offer: any, offererPeerId: string }) => {
      const { offer, offererPeerId } = payload;
      console.log('Recibida oferta de:', offererPeerId);
      const pc = createPeerConnection(offererPeerId);
      
      pc.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          socket.emit('webrtc-answer', {
            targetPeerId: offererPeerId,
            answer: pc.localDescription,
          });
        });
    });

    socket.on('webrtc-answer', (payload: { answer: any, answererPeerId: string }) => {
      const { answer, answererPeerId } = payload;
      console.log('Recibida respuesta de:', answererPeerId);
      const pc = peerConnections.get(answererPeerId);
      pc?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice-candidate', (payload: { candidate: any, senderPeerId: string }) => {
      const { candidate, senderPeerId } = payload;
      const pc = peerConnections.get(senderPeerId);
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('webrtc-user-left', (peerId: string) => {
      console.log('Usuario salió:', peerId);
      peerConnections.get(peerId)?.close();
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
      setPeerStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
    });

    return () => {
      socket.off('existing-users');
      socket.off('webrtc-user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('webrtc-user-left');
    };

  }, [socket, peerConnections]); 

  const toggleCamera = async () => {
    if (isCameraOn) {
      const videoTrack = myStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        setIsCameraOn(false);
        
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = null;
        }
      }
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        if (myStreamRef.current) {
          const oldVideoTracks = myStreamRef.current.getVideoTracks();
          oldVideoTracks.forEach(track => myStreamRef.current?.removeTrack(track));
          
          myStreamRef.current.addTrack(newVideoTrack);
          
          if (myVideoRef.current) {
            myVideoRef.current.srcObject = myStreamRef.current;
          }
          
          peerConnections.forEach(pc => {
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, myStreamRef.current!);
            }
          });
        }
        
        setIsCameraOn(true);
      } catch (err) {
        console.error("Error al reactivar cámara:", err);
        alert("No se pudo activar la cámara. Verifica los permisos.");
      }
    }
  };

  const toggleMicrophone = () => {
    if (myStreamRef.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicrophoneOn(audioTrack.enabled);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-300px) scale(1.2) rotate(10deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-600px) scale(0.5) rotate(20deg);
            opacity: 0;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .float-animation {
          animation: floatUp 3s ease-out forwards;
        }
      `}</style>

      {/* Reacciones flotantes */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 999,
      }}>
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="float-animation"
            style={{
              position: 'absolute',
              left: `${reaction.x}%`,
              bottom: '0%',
              fontSize: '48px',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 
          peerStreams.size === 0 ? '1fr' : // Solo yo - pantalla completa
          peerStreams.size === 1 ? 'repeat(2, 1fr)' : // 2 personas - 2 columnas
          peerStreams.size === 2 ? 'repeat(2, 1fr)' : // 3 personas - 2 columnas
          peerStreams.size === 3 ? 'repeat(2, 1fr)' : // 4 personas - 2 columnas
          'repeat(3, 1fr)', // 5+ personas - 3 columnas
        gridAutoRows: 
          peerStreams.size === 0 ? '1fr' : // Solo yo - altura completa
          peerStreams.size === 1 ? '1fr' : // 2 personas - misma altura
          'minmax(250px, 1fr)', // 3+ personas - altura mínima
        gap: peerStreams.size === 0 ? '0' : '12px',
        padding: peerStreams.size === 0 ? '0' : '20px',
        height: 'calc(100% - 120px)',
        width: '100%',
        maxWidth: '100%',
      }}>
        <div style={{ 
          position: 'relative', 
          backgroundColor: '#2a2a2a', 
          borderRadius: peerStreams.size === 0 ? '0' : '12px',
          overflow: 'hidden',
          border: isSpeaking && isMicrophoneOn ? '3px solid #4CAF50' : '3px solid rgba(255,255,255,0.1)',
          transition: 'border 0.3s ease',
          boxShadow: isSpeaking && isMicrophoneOn ? '0 0 20px rgba(76, 175, 80, 0.5)' : 'none',
          minHeight: peerStreams.size === 0 ? '100%' : peerStreams.size >= 4 ? '200px' : '300px',
          width: '100%',
          height: '100%',
        }}>
          {isCameraOn ? (
            <video 
              ref={myVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000',
            }}>
              <VideoOff size={64} color="#666" />
            </div>
          )}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: peerStreams.size >= 4 ? '11px' : '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
          }}>
            <span>Tú {!isCameraOn && '(Cámara apagada)'}</span>
            {isSpeaking && isMicrophoneOn && (
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 1s infinite',
                boxShadow: '0 0 8px rgba(76, 175, 80, 0.8)',
              }} />
            )}
          </div>
        </div>

        {Array.from(peerStreams.entries()).map(([peerId, stream], index) => (
          <div 
            key={peerId} 
            style={{ 
              position: 'relative', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '12px', 
              overflow: 'hidden',
              border: peersSpeaking.has(peerId) ? '3px solid #2196F3' : '3px solid rgba(255,255,255,0.1)',
              transition: 'border 0.3s ease',
              boxShadow: peersSpeaking.has(peerId) ? '0 0 20px rgba(33, 150, 243, 0.5)' : 'none',
              minHeight: peerStreams.size >= 4 ? '200px' : '300px',
            }}
          >
            <video
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              ref={videoEl => {
                if (videoEl) videoEl.srcObject = stream;
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              backgroundColor: 'rgba(0,0,0,0.75)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: peerStreams.size >= 4 ? '11px' : '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
            }}>
              <span>Participante {index + 1}</span>
              {peersSpeaking.has(peerId) && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2196F3',
                  animation: 'pulse 1s infinite',
                  boxShadow: '0 0 8px rgba(33, 150, 243, 0.8)',
                }} />
              )}
            </div>
            {/* Indicador de número de participante en esquina superior */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(33, 150, 243, 0.9)',
              color: 'white',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Contador de participantes */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          animation: 'pulse 2s infinite',
        }}></div>
        <span>{peerStreams.size + 1} Participante{peerStreams.size !== 0 ? 's' : ''} en la llamada</span>
      </div>

      {/* Controles de video y emojis */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '15px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px 30px',
        borderRadius: '50px',
        zIndex: 1000,
      }}>
        <button
          onClick={toggleCamera}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isCameraOn ? '#4CAF50' : '#f44336',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          title={isCameraOn ? 'Desactivar cámara' : 'Activar cámara'}
        >
          {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        <button
          onClick={toggleMicrophone}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isMicrophoneOn ? '#4CAF50' : '#f44336',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          title={isMicrophoneOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {isMicrophoneOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {/* Botón de Reacciones */}
        <button
          onClick={() => setShowEmojiPanel(!showEmojiPanel)}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: showEmojiPanel ? '#FF9800' : '#2196F3',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          title="Reacciones"
        >
          <Smile size={24} />
        </button>
      </div>

      {/* Panel de Emojis */}
      {showEmojiPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'scaleIn 0.2s ease-out',
          zIndex: 1001,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}>
            {emojiOptions.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  sendReaction(emoji);
                  if (navigator.vibrate) {
                    navigator.vibrate(50);
                  }
                }}
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '56px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title={`Presiona ${index + 1}`}
              >
                {emoji}
                <div style={{
                  position: 'absolute',
                  bottom: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  {index + 1}
                </div>
              </button>
            ))}
          </div>
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '11px',
          }}>
            💡 Presiona 1-8 para reacciones rápidas
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;