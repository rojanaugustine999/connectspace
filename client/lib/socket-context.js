"use client";

// One Socket.io connection for the whole app, opened when you log in and closed when you log out.
//   const { socket, connected } = useSocket();
//   useSocketEvent("message:new", (data) => { ... });
//
// The browser sends our httpOnly JWT cookie with the connection (withCredentials),
// and the server's io.use() middleware logs us in with it, just like REST requests.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/lib/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return; // logged out → no socket

    const s = io(API_URL, { withCredentials: true });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => {
      setConnected(false);
      if (err.message === "unauthorized") s.disconnect(); // cookie gone/expired: stop retrying
    });
    setSocket(s);

    return () => {
      // Runs on logout (user becomes null) or when a different user logs in.
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

// Subscribe to a socket event for as long as the component is on screen.
// The handler can change every render without re-subscribing (we keep the latest in a ref).
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const listener = (data) => handlerRef.current(data);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
