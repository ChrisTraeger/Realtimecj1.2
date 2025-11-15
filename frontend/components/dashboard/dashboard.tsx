"use client"

import { useState, useEffect } from "react"
import { useRooms } from "@/hooks/useRooms"
import RoomsView from "./rooms-view"
import RoomDetail from "./room-detail"
import Header from "./header"

interface DashboardProps {
  user: { id: number; username: string; role: string };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const { rooms, refreshRooms } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  if (selectedRoom) {
    return (
      <RoomDetail
        room={selectedRoom}
        user={user}
        onBack={() => {
          setSelectedRoom(null);
          refreshRooms();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50">
      <Header user={user} onLogout={onLogout} />
      <RoomsView user={user} rooms={rooms} onSelectRoom={setSelectedRoom} onRefresh={refreshRooms} />
    </div>
  );
}
