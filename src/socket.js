import { io } from "socket.io-client";

// Temporary local-backend test through Cloudflare Tunnel
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://tower-foot-measuring-shadows.trycloudflare.com";

const socket = io(SOCKET_URL, {
  withCredentials: true,
});

export default socket;