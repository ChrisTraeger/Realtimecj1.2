"use client"

import { useState, useEffect } from "react"
import { getSocket } from "@/lib/socket"

interface HeaderProps {
  user: { id: number; username: string; role: string }
  onLogout: () => void
}

export default function Header({ user, onLogout }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true"
    }
    return false
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    const socket = getSocket();

    socket.on('mentionNotification', (notification: any) => {
      console.log('Notificación de mención recibida en header:', notification);
      const newNotification = {
        id: Date.now(),
        message: `${notification.mentionedBy} te mencionó en el chat`,
        timestamp: Date.now(),
        type: 'mention',
        roomCode: notification.roomCode,
        roomId: notification.roomId
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    socket.on('voteNotification', (notification: any) => {
      console.log('Notificación de voto recibida en header:', notification);
      const newNotification = {
        id: Date.now(),
        message: `${notification.votedBy} votó en tu encuesta "${notification.pollQuestion}"`,
        timestamp: Date.now(),
        type: 'vote',
        roomCode: notification.roomCode,
        roomId: notification.roomId,
        pollId: notification.pollId
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    socket.on('pollExpiringSoon', (data: { pollId: number, roomCode: string, message: string }) => {
      console.log('Notificación de votación por cerrar recibida en header:', data);
      const newNotification = {
        id: Date.now(),
        message: data.message,
        timestamp: Date.now(),
        type: 'pollExpiring',
        roomCode: data.roomCode,
        pollId: data.pollId
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    socket.on('pollExpired', (data: { pollId: number, roomCode: string, message: string }) => {
      console.log('Notificación de votación cerrada recibida en header:', data);
      const newNotification = {
        id: Date.now(),
        message: data.message,
        timestamp: Date.now(),
        type: 'pollExpired',
        roomCode: data.roomCode,
        pollId: data.pollId
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      socket.off('mentionNotification');
      socket.off('voteNotification');
      socket.off('pollExpiringSoon');
      socket.off('pollExpired');
    };
  }, []);

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())
  }

  const handleNotificationClick = (notification: any) => {
    if ((notification.type === 'mention' || notification.type === 'vote' || notification.type === 'pollExpiring' || notification.type === 'pollExpired') && notification.roomCode) {
      console.log('Navegar a sala:', notification.roomCode);
    }
  }

  return (
    <header className="glass-morphism sticky top-0 z-50 border-b border-green-200/30 dark:border-green-900/30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">✓</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-green-600 dark:text-green-400">Votar</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Toma de decisiones colaborativa</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={handleDarkModeToggle}
            className="p-2 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-300 ease-out"
            title="Cambiar modo oscuro"
          >
            {darkMode ? (
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1m-16 0H1m15.364 1.636l.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-slate-400 dark:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                />
              </svg>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-300 ease-out"
            >
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-green-200/30 dark:border-green-900/30 rounded-xl shadow-lg z-50">
                <div className="p-4 border-b border-green-200/30 dark:border-green-900/30">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notificaciones</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className="px-4 py-3 border-b border-green-100/30 dark:border-green-900/20 hover:bg-green-50/50 dark:hover:bg-slate-700/50 cursor-pointer"
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-200">{notif.message}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {notif.type === 'mention' 
                            ? 'Mención en chat' 
                            : notif.type === 'vote' 
                            ? 'Voto en encuesta' 
                            : notif.type === 'pollExpiring'
                            ? '⚠️ Votación por cerrar'
                            : notif.type === 'pollExpired'
                            ? '⏰ Votación cerrada'
                            : 'Hace poco'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No hay notificaciones
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.username}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Rol: {user.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-300 ease-out flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}
