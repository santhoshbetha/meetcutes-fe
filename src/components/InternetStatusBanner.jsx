import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";

export function InternetStatusBanner() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [message, setMessage] = useState("");
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setMessage("No internet connection");
      setShowBanner(true);
      setWasOffline(true);
    } else {
      if (wasOffline) {
        setMessage("Back online");
        setShowBanner(true);
        // Hide the "Back online" message after 3 seconds
        const timer = setTimeout(() => {
          setShowBanner(false);
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        setShowBanner(false);
      }
      setWasOffline(false);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${
      isOnline ? "bg-green-500" : "bg-red-500"
    }`}>
      <div className="flex items-center justify-center space-x-2 text-white">
        {isOnline ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}