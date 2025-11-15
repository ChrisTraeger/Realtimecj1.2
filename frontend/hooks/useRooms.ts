import { useState, useCallback } from "react";
import roomService from "@/lib/api/rooms";

export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await roomService.getUserRooms();
      setRooms(data);
    } catch (err) {
      setError("Error al cargar salas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRoom = async ({ name, description }: { name: string; description: string }) => {
    await roomService.createRoom({ name, description });
    await fetchRooms();
  };

  const joinRoom = async (code: string) => {
    const room = await roomService.joinRoom(code);
    // Note: For now, joining a room doesn't add it to user's rooms list
    // This could be changed later to show joined rooms in the list
    await fetchRooms();
    return room;
  };

  const deleteRoom = async (roomId: number) => {
    await roomService.closeRoom(roomId);
    await fetchRooms();
  };

  const leaveRoom = async (code: string) => {
    await roomService.leaveRoom(code);
    await fetchRooms();
  };

  const getRoomByCode = async (code: string) => {
    return await roomService.getRoomByCode(code);
  };

  return {
    rooms,
    isLoading,
    error,
    refreshRooms: fetchRooms,
    createRoom,
    joinRoom,
    deleteRoom,
    leaveRoom,
    getRoomByCode,
  };
}
