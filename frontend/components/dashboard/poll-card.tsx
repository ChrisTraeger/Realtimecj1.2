"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"

interface PollCardProps {
  poll: Poll
  userId: string
  onVote: (optionId: string) => void
  onDelete: () => void
  onClose?: () => void
  isCreator?: boolean
}

interface PollOption {
  id: string
  text: string
  votes: string[]
}

interface Poll {
  id: string
  title?: string
  question?: string
  options: PollOption[]
  isOpen?: boolean
  deadline?: string
}

export default function PollCard({ poll, userId, onVote, onDelete, onClose, isCreator }: PollCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const calculateTimeLeft = () => {
    if (!poll.deadline) return "";
    const now = new Date().getTime();
    const deadline = new Date(poll.deadline).getTime();
    const distance = deadline - now;
    if (distance < 0) {
      return "Expirada";
    } else {
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
  };

  const [timeLeft, setTimeLeft] = useState<string>(calculateTimeLeft)

  const userVote = poll.options.find((opt) => opt.votes.includes(userId))
  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)

  // Calcular tiempo restante
  useEffect(() => {
    if (!poll.deadline) return;

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  });

  if (showDetails) {
    const chartColors = ["#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f97316", "#eab308", "#6366f1", "#14b8a6"]

    const chartData = poll.options.map((option, index) => ({
      name: option.text,
      value: option.votes.length,
      color: chartColors[index % chartColors.length],
    }))

    const validChartData =
      chartData.filter((item) => item.value > 0).length > 0
        ? chartData
        : [{ name: "Sin votos", value: 1, color: "#e5e7eb" }]

    return (
      <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-green-300/50 dark:border-green-900/30 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{poll.question || poll.title}</h3>
            {!poll.isOpen && <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cerrada</Badge>}
          </div>
        <button
          onClick={() => setShowDetails(false)}
          className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-300 ease-out"
        >
          Volver
        </button>
      </div>

        <div className="grid grid-cols-4 gap-4 p-4 bg-green-50 dark:bg-slate-700/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalVotes}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Votos totales</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{poll.options.length}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Opciones</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userVote ? "✓" : "—"}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Tu voto</p>
          </div>
          {poll.deadline && (
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {timeLeft === "Expirada" ? "—" : timeLeft}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {timeLeft === "Expirada" ? "Expirada" : "Tiempo restante"}
              </p>
            </div>
          )}
        </div>

        <div className="py-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Distribución de Votos</h4>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={validChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {validChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid #22c55e",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                  }}
                  formatter={(value) => `${value} voto${value !== 1 ? "s" : ""}`}
                  labelStyle={{ color: "#22c55e" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 py-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalle de Votos</h4>
          {poll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0

            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    ></div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{option.text}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {option.votes.length} ({percentage.toFixed(1)}%)
                  </p>
                </div>

                {option.votes.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-5">
                    {option.votes.map((voterId) => (
                      <span
                        key={voterId}
                        className="inline-block px-2.5 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium"
                      >
                        Usuario {voterId.slice(0, 4)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-3 border-t border-green-200/30 dark:border-green-900/20 flex gap-2">
          {isCreator && poll.isOpen && onClose && (
            <button
              onClick={onClose}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-300 ease-out"
            >
              Cerrar votación
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-green-300/50 dark:border-green-900/30 space-y-3 cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all duration-300 ease-out"
      onClick={() => setShowDetails(true)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <h3 className="font-semibold text-slate-900 dark:text-white">{poll.question || poll.title}</h3>
          {!poll.isOpen && <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cerrada</Badge>}
          {poll.isOpen && poll.deadline && timeLeft && (
            <Badge 
              variant="outline" 
              className={
                timeLeft === "Expirada" 
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                  : timeLeft.includes("s") && !timeLeft.includes("m") && !timeLeft.includes("h")
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse"
                  : timeLeft.includes("m") && parseInt(timeLeft) < 5
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }
            >
              ⏰ {timeLeft}
            </Badge>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 ease-out"
          title="Eliminar votación"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {poll.options.slice(0, 3).map((option) => {
          const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0
          const isSelected = userVote?.id === option.id

          return (
            <button
              key={option.id}
              onClick={(e) => {
                e.stopPropagation()
                onVote(option.id)
              }}
              className={`w-full text-left transition-all ${isSelected ? "ring-2 ring-green-400 dark:ring-green-500" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${isSelected ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {option.text}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{option.votes.length}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
        Total: {totalVotes} voto{totalVotes !== 1 ? "s" : ""} •{" "}
        <span className="text-green-600 dark:text-green-400 font-medium">Haz clic para ver gráficos</span>
      </p>
    </div>
  )
}
