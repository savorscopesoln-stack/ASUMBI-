import { io } from "socket.io-client";

// Set VITE_SOCKET_URL in your frontend .env / Vercel env vars for production,
// e.g. VITE_SOCKET_URL=https://your-backend.onrender.com
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  withCredentials: true,
});

export default socket;