import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
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

  // Función para obtener respuesta del bot
  const getBotResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();

    // Respuestas predefinidas para preguntas comunes
    const responses: { [key: string]: string } = {
      'hola': '¡Hola! ¿Cómo puedo ayudarte hoy?',
      'como estas': '¡Estoy muy bien, gracias por preguntar! ¿Y tú?',
      'que puedes hacer': 'Puedo ayudarte con preguntas sobre la videollamada, controles, y resolver dudas básicas. ¡Pregúntame lo que necesites!',
      'ayuda': 'Puedo ayudarte con: \n• Controles de cámara y micrófono\n• Información sobre la videollamada\n• Preguntas generales\n¿Qué necesitas saber?',
      'camara': 'Para controlar tu cámara, usa el botón verde/rojo en la parte inferior. Verde = encendida, Rojo = apagada.',
      'microfono': 'Para controlar tu micrófono, usa el botón junto al de cámara. Verde = encendido, Rojo = silenciado.',
      'como funciona': 'Esta es una videollamada WebRTC. Puedes activar/desactivar tu cámara y micrófono con los botones en la parte inferior.',
      'gracias': '¡De nada! ¿Hay algo más en lo que pueda ayudarte?',
      'adios': '¡Hasta luego! Si necesitas ayuda, estaré aquí.',
    };

    // Buscar coincidencias
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    // Respuesta por defecto
    return 'Interesante pregunta. Puedo ayudarte con información sobre los controles de videollamada. ¿Necesitas ayuda con algo específico?';
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
    setInputValue('');
    setIsTyping(true);

    // Simular delay de escritura
    setTimeout(async () => {
      const botResponseText = await getBotResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Botón flotante */}
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
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
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

      {/* Ventana del chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={24} />
              <div>
                <div style={{ fontWeight: 'bold' }}>Asistente Virtual</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Siempre disponible</div>
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
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#f5f5f5',
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '12px',
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: message.sender === 'user' ? '#2196F3' : 'white',
                  color: message.sender === 'user' ? 'white' : '#333',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '12px',
              }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                }}>
                  <span style={{ fontSize: '20px' }}>...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: '8px',
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid #e0e0e0',
                outline: 'none',
                fontSize: '14px',
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: inputValue.trim() ? '#2196F3' : '#ccc',
                color: 'white',
                border: 'none',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;