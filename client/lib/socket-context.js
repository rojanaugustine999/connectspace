"use client";

// One Socket.io connection for the whole app, opened when you log in and closed when you log out.
//   const { socket, connected } = useSocket();
//   useSocketEvent("message:new", (data) => { ... });
//
// How it logs in: the socket connects DIRECTLY to the API server (Vercel can't proxy WebSockets),
// so our login cookie (which belongs to this site) isn't sent. Instead, before every connection
// attempt, we fetch a 2-minute token through the normal /api proxy (logged in with the cookie)
// and pass it in `auth`. The server's io.use() middleware checks it.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Public (browser-visible) address of the API server, e.g. https://connectspace-api.onrender.com
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
const SocketContext = createContext({ socket: null, connected: false });

// Called by Socket.io on the first connect AND every reconnect, so tokens never go stale.
async function getAuth(callback) {
  try {
    const { token } = await api("/api/auth/socket-token");
    callback({ token });
  } catch {
    callback({}); // not logged in anymore → the server will refuse the connection
  }
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return; // logged out → no socket

    const s = io(SOCKET_URL, { auth: getAuth });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => {
      setConnected(false);
      if (err.message === "unauthorized") s.disconnect(); // logged out / session expired: stop retrying
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
