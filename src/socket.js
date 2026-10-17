import { io } from "socket.io-client";

// Temporary local-backend test through Cloudflare Tunnel
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://tower-foot-measuring-shadows.trycloudflare.com";

const readToken = () => {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
};

// The token tells the server which school this socket belongs to, so realtime
// events (notifications, exam activation) only reach that school's users.
const socket = io(SOCKET_URL, {
  withCredentials: true,
  auth: (cb) => cb({ token: readToken() }),
});

let sentToken = null;
const authenticate = () => {
  const t = readToken();
  if (t === sentToken) return;
  sentToken = t;
  if (t && socket.connected) socket.emit("auth", t);
};
socket.on("connect", () => { sentToken = null; authenticate(); });
// pick up a login / logout / school switch that happens after the socket opened
if (typeof window !== "undefined") setInterval(authenticate, 3000);

export default socket;
