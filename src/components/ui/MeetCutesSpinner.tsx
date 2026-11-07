import React from "react";
import { cn } from "@/lib/utils";

export function MeetCutesSpinner({ className, size = "medium" }) {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-10 h-10",
    large: "w-14 h-14",
    xlarge: "w-20 h-20",
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Main spinning gradient ring */}
      <div
        className={cn(
          "relative rounded-full",
          sizeClasses[size],
        )}
      >
        {/* Outer gradient ring */}
        <div
          className="absolute inset-0 rounded-full bg-linear-to-r from-orange-400 via-red-500 to-pink-500 animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, #fb923c 0%, #ef4444 33%, #ec4899 66%, #fb923c 100%)",
            padding: size === "small"
              ? "2px"
              : size === "medium"
              ? "3px"
              : size === "large"
              ? "4px"
              : "5px",
          }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-gray-900">
          </div>
        </div>

        {/* Inner pulsing heart */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative animate-pulse">
            <svg
              className={cn(
                "text-red-500 drop-shadow-lg",
                size === "small"
                  ? "w-2 h-2"
                  : size === "medium"
                  ? "w-3 h-3"
                  : size === "large"
                  ? "w-4 h-4"
                  : "w-6 h-6",
              )}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        {/* Floating sparkles */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
            <div
              className="w-1 h-1 bg-pink-400 rounded-full animate-ping"
              style={{ animationDelay: "0s", animationDuration: "2s" }}
            >
            </div>
          </div>
          <div className="absolute top-1/4 right-0 transform translate-x-1/2">
            <div
              className="w-1 h-1 bg-orange-400 rounded-full animate-ping"
              style={{ animationDelay: "0.5s", animationDuration: "2s" }}
            >
            </div>
          </div>
          <div className="absolute bottom-1/4 left-0 transform -translate-x-1/2">
            <div
              className="w-1 h-1 bg-red-400 rounded-full animate-ping"
              style={{ animationDelay: "1s", animationDuration: "2s" }}
            >
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
