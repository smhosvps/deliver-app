// hooks/useSocket.ts
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";


const SOCKET_URL = "http://192.168.102.47:8400"; // no /api/v1

export const useSocket = () => {
    const { data: userx }: any = useGetUserQuery();

    const user = userx?.user
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!user?._id) return;

        // Create connection
        const socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected");
            setIsConnected(true);
            socket.emit("register", user?._id);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket error:", err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user?._id]);

    return { socket: socketRef.current, isConnected };
};