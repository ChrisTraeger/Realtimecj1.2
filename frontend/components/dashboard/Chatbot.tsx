import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  roomName?: string;
  activeTab?: 'chat' | 'voting';
}

const Chatbot = ({ roomName = 'la sala', activeTab = 'chat' }: ChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `¡Hola! Soy tu asistente inteligente de ${roomName}. Puedo ayudarte con chat, votaciones, videollamadas y cualquier pregunta. ¿Qué necesitas?`,
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para obtener respuesta de IA
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Eres un asistente útil de una sala de videollamadas llamada "${roomName}". 
              
Contexto de la sala:
- Los usuarios pueden chatear en tiempo real
- Pueden crear y participar en votaciones/encuestas
- Hay videollamada con controles de cámara y micrófono
- Se pueden ver los miembros conectados
- El usuario actual está en la pestaña: ${activeTab}

Responde de forma concisa, amigable y útil. Si te preguntan sobre funcionalidades de la sala, explica cómo usarlas.

Pregunta del usuario: ${userMessage}`
            }
          ],
        })
      });

      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      
      // Si falla la IA, usar respuesta de respaldo
      return getFallbackResponse(userMessage);
      
    } catch (error) {
      console.error("Error con IA:", error);
      return getFallbackResponse(userMessage);
    }
  };

  // Respuestas de respaldo si la IA falla
  const getFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    const responses: { [key: string]: string } = {
      'hola': '¡Hola! ¿En qué puedo ayudarte con la sala?',
      'ayuda': 'Puedo ayudarte con:\n• 📝 Chat y mensajes\n• 📊 Votaciones y encuestas\n• 🎥 Videollamada y controles\n• 👥 Gestión de miembros\n• 🔗 Códigos e invitaciones\n\n¿Qué necesitas saber?',
      'votar': 'Para votar:\n1. Ve a la pestaña "Votaciones"\n2. Lee las opciones disponibles\n3. Haz clic en la opción que prefieras\n4. Tu voto se contará automáticamente',
      'chat': 'En la pestaña Chat puedes enviar mensajes a todos los miembros en tiempo real. Solo escribe y presiona Enter.',
      'camara': 'Para controlar tu cámara, usa el botón verde/rojo en la videollamada. Verde = encendida, Rojo = apagada.',
      'microfono': 'Para controlar tu micrófono, usa el botón junto al de cámara. Verde = encendido, Rojo = silenciado.',
      'codigo': 'El código de la sala está en la parte superior. Haz clic en el ícono de copiar para compartirlo.',
    };

    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    return 'Puedo ayudarte con chat, votaciones, videollamada, miembros y códigos de sala. ¿Qué necesitas saber específicamente?';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Obtener respuesta de IA
    const botResponseText = await getAIResponse(currentInput);
    
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponseText,
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s',
            zIndex: 1000,
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageCircle size={28} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '380px',
          height: '550px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bot size={26} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Asistente IA</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Potenciado por Claude</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                opacity: 0.9,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#f9fafb',
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '14px',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: message.sender === 'user' ? '#10b981' : 'white',
                  color: message.sender === 'user' ? 'white' : '#1f2937',
                  boxShadow: message.sender === 'user' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '14px',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  gap: '4px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0s',
                  }} />
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0.2s',
                  }} />
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0.4s',
                  }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '10px',
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta lo que quieras..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '24px',
                border: '2px solid #e5e7eb',
                outline: 'none',
                fontSize: '14px',
                transition: 'border 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#10b981'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: inputValue.trim() && !isTyping ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (inputValue.trim() && !isTyping) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (inputValue.trim() && !isTyping) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </>
  );
};

export default Chatbot;