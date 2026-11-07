import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Guards a route with the Zustand bearer session.
 *
 * The token is the canonical session flag: it is hydrated synchronously from
 * secure storage before the first render, so a hard navigation to a protected
 * URL does not briefly look signed out.
 */
export function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
