import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Menu, X, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import secureLocalStorage from "react-secure-storage";
import { successAlert } from "@/services/alert.service";
import { logoutUser } from "../services/user.service";
import { useAuth } from "@/context/AuthContext";
import { useSearchStore } from "@/stores/searchStore";
import { useAutocompleteStore } from "@/stores/autocompleteStore";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useNotificationChannel } from "@/hooks/useNotificationChannel";

const NavAfter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const resetSearchState = useSearchStore((state) => state.reset);
  const resetAutocompleteData = useAutocompleteStore((state) => state.reset);
  const { user, profiledata, userSession } = useAuth();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const notificationCount = unreadNotifications;

  // Keep the badge live everywhere except the inbox page, which owns the
  // subscription itself. This avoids joining the same personal topic twice.
  useNotificationChannel({
    token: userSession?.access_token,
    userId: profiledata?.userid,
    enabled:
      Boolean(userSession?.access_token && profiledata?.userid) &&
      location.pathname !== "/notifications",
  });

  const getInitials = () => {
    if (profiledata?.firstname && profiledata?.lastname) {
      return `${profiledata.firstname[0]}${profiledata.lastname[0]}`.toUpperCase();
    }
    return 'U';
  };

  async function onLogout() {
    const res = await logoutUser();
    if (res.success) {
      localStorage.clear();
      resetSearchState()
      secureLocalStorage.clear()
      resetAutocompleteData()
      // Force dark mode for homepage after logout
      document.documentElement.classList.add("dark");
      navigate('/')
      successAlert('', 'Logout Successful');
    } else {
      localStorage.clear();
      resetSearchState()
      secureLocalStorage.clear()
      resetAutocompleteData()
      // Force dark mode for homepage after logout
      document.documentElement.classList.add("dark");
      navigate('/')
    }
    queryClient.clear();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center">
            <img src="/mc-48-orange2.png" alt="Logo" className="h-10 w-10 mr-2" />
            <span className="text-4xl font-normal tracking-wider bg-linear-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent font-['Bebas_Neue']">
              MeetCutes.us
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <Link
            to="/about"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Contact
          </Link>
          <Link
            to="/donate"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Donate
          </Link>
          <Link
            to="/search"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Search
          </Link>
          <Link
            to="/donate"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden"
          >
            Our2Cents
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <Link to="/notifications" className="relative cursor-pointer group">
            <Bell className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Link>

          <Button
            className="hidden lg:flex bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 md:px-6 font-medium shadow-sm text-sm"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9" style={{ cursor: "pointer" }}>
                <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
                <AvatarFallback>{getInitials()}</AvatarFallback>
                <span className="sr-only">Toggle user menu</span>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                {profiledata?.firstname} {profiledata?.lastname}
              </div>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {user?.email || 'email@example.com'}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link to="/photos">Photos</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/changepassword">Change Password</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu icon */}
          <div className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
            <button
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/about" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link to="/contact" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <Link to="/donate" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
              Donate
            </Link>
            <Link to="/search" className="block px-3 py-2 text-muted-foreground hover:text-foreground">
              Search
            </Link>
            <div className="px-3 py-2">
              <ThemeToggle />
            </div>
            <div className="flex space-x-2 px-3 pt-2">
              <Button size="sm"
                className="flex-1 text-lg"
                onClick={onLogout}
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavAfter;
