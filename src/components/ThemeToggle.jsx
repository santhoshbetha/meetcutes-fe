import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function ThemeToggle() {
  const { user } = useAuth();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // If user is not logged in, always force dark mode
    if (!user) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      return;
    }

    // If user is logged in, use saved preference or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user]);

  const toggleTheme = () => {
    // Don't allow toggling if user is not logged in
    if (!user) return;

    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={!user}
      className="h-9 w-9"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">
        {user ? "Toggle theme" : "Dark mode (login to change)"}
      </span>
    </Button>
  );
}