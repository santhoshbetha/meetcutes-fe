import { Socket } from "phoenix";
import { API_BASE_URL } from "@/lib/api";

// Vite statically replaces `import.meta.env.VITE_WS_URL` at build/dev time.
// Keep the access direct (no optional chaining) so the replacement applies.
const configuredWsUrl = import.meta.env.VITE_WS_URL || "";

/**
 * Resolves the Phoenix socket endpoint.
 *
 * `VITE_WS_URL` wins when set (useful when the API sits behind a different
 * host/CDN). Otherwise the socket shares the API origin and path, e.g.
 * `http://localhost:4000` -> `ws://localhost:4000/socket`.
 */
export function socketUrl() {
  if (configuredWsUrl) {
    return String(configuredWsUrl).replace(/\/+$/, "");
  }

  return `${API_BASE_URL.replace(/^http/, "ws")}/socket`;
}

let socket = null;
let socketToken = null;
let socketRefCount = 0;

/**
 * Returns a shared Phoenix socket authenticated with the current bearer token.
 *
 * A token change tears the previous socket down so a revoked session can never
 * keep receiving broadcasts. Phoenix handles reconnect/backoff internally.
 */
export function getSocket(token) {
  if (!token) return null;

  if (socket && socketToken === token) {
    return socket;
  }

  disconnectSocket();

  socketToken = token;
  socket = new Socket(socketUrl(), { params: { token } });
  socket.connect();

  return socket;
}

/**
 * Ref-counted variant used by channel hooks. The socket stays alive while at
 * least one component is subscribed and disconnects when the last one unmounts.
 */
export function acquireSocket(token) {
  const current = getSocket(token);
  if (current) socketRefCount += 1;
  return current;
}

export function releaseSocket() {
  socketRefCount = Math.max(0, socketRefCount - 1);

  if (socketRefCount === 0) {
    disconnectSocket();
  }
}

/**
 * Closes the shared socket. Safe to call when no socket exists.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = null;
  socketToken = null;
  socketRefCount = 0;
}

/**
 * Returns true when a socket is currently established.
 */
export function isSocketConnected() {
  return Boolean(socket?.isConnected());
}
