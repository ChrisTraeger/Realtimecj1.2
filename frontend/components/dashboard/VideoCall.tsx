'use client'; 
import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

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

const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId }) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);

  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // Estados para controlar cámara y micrófono
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  
  // Estados para indicadores de audio
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peersSpeaking, setPeersSpeaking] = useState<Set<string>>(new Set());

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        
        // Detectar cuando estoy hablando
        const audioContext = new AudioContext();
        const audioSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioSource.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const detectSound = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setIsSpeaking(average > 30); // Umbral de detección
          requestAnimationFrame(detectSound);
        };
        
        detectSound();
      })
      .catch(err => console.error("Error al obtener media:", err));
  }, []); 

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
        
        // Detectar cuando el peer está hablando
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

    socket.on('webrtc-user-joined', (peerId: string) => {
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
      socket.off('webrtc-user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('webrtc-user-left');
    };

  }, [socket, peerConnections]); 

  // Función para activar/desactivar cámara
  const toggleCamera = () => {
    if (myStreamRef.current) {
      const videoTrack = myStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  // Función para activar/desactivar micrófono
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
      `}</style>
      {/* Grid de videos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: peerStreams.size === 0 ? '1fr' : peerStreams.size === 1 ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gridTemplateRows: peerStreams.size === 0 ? '1fr' : peerStreams.size === 1 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '10px',
        padding: '20px',
        height: 'calc(100% - 100px)',
      }}>
        {/* Mi video */}
        <div style={{ 
          position: 'relative', 
          backgroundColor: '#2a2a2a', 
          borderRadius: '8px', 
          overflow: 'hidden',
          border: isSpeaking && isMicrophoneOn ? '4px solid #4CAF50' : '4px solid transparent',
          transition: 'border 0.2s ease',
        }}>
          <video 
            ref={myVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>Tú {!isCameraOn && '(Cámara apagada)'}</span>
            {isSpeaking && isMicrophoneOn && (
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                animation: 'pulse 1s infinite',
              }} />
            )}
          </div>
        </div>

        {/* Videos de otros participantes */}
        {Array.from(peerStreams.entries()).map(([peerId, stream]) => (
          <div 
            key={peerId} 
            style={{ 
              position: 'relative', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '8px', 
              overflow: 'hidden',
              border: peersSpeaking.has(peerId) ? '4px solid #2196F3' : '4px solid transparent',
              transition: 'border 0.2s ease',
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
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>Participante</span>
              {peersSpeaking.has(peerId) && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2196F3',
                  animation: 'pulse 1s infinite',
                }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Controles de video */}
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
      }}>
        {/* Botón de cámara */}
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

        {/* Botón de micrófono */}
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
      </div>
    </div>
  );
};

export default VideoCall;