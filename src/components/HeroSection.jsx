import { Button } from "@/components/ui/button";
import { LayoutDashboard, Heart, Users, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import meetcutesimg from "@/assets/meetcutes-main.png";
import PrimaryGradient from "@/components/ui/PrimaryGradient";
import { useAuth } from "../context/AuthContext";

export default function HeroSection({ setOpenLogin }) {
  const { user } = useAuth()
  const navigate = useNavigate();

  async function onDashBoardClick() {
    if (user) {
        navigate('/dashboard');
    } else {
        setOpenLogin(true);
    }
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-24 md:px-16 lg:px-20 relative z-10">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <div className="space-y-6 sm:space-y-8">
            {/* Floating Elements */}
            <div className="relative">
              <div className="absolute -top-2 sm:-top-4 -left-2 sm:-left-4 w-6 h-6 sm:w-8 sm:h-8 bg-primary/20 rounded-full animate-bounce delay-1000"></div>
              <div className="absolute -top-4 sm:-top-8 -right-4 sm:-right-8 w-4 h-4 sm:w-6 sm:h-6 bg-pink-500/30 rounded-full animate-bounce delay-2000"></div>

              <div
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif leading-[1.1] text-balance font-bold bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-fade-in"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Singles exclusive meet "In Real Life" first platform
              </div>
            </div>

            <div className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium animate-fade-in delay-300">
              Not at bars or no forever swipes or messages. Go to your local
              stores, malls, coffee shops, parks and stumble upon other singles in
              an organic way.
            </div>

            <div className="text-base sm:text-lg md:text-xl font-semibold text-foreground/80 max-w-xl animate-fade-in delay-500">
              This app brings approachable people together.
            </div>

            {/* Feature Highlights */}
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4 animate-fade-in delay-700">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-sm">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                <span className="text-xs sm:text-sm font-medium">Real Connections</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-sm">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-medium">Local Events</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                <span className="text-xs sm:text-sm font-medium">Organic Meetings</span>
              </div>
            </div>

            <div className="pt-4 sm:pt-6 animate-fade-in delay-1000">
              <Button
                className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group w-full sm:w-auto"
                size={"lg"}
                onClick={onDashBoardClick}
              >
                Get Started
                <LayoutDashboard size={20} className="ml-2 sm:ml-3 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </div>
          </div>

          <div className="relative animate-fade-in delay-500">
            <PrimaryGradient className="relative aspect-4/3 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-500">
              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent z-10"></div>
              <img
                src={meetcutesimg}
                alt="People meeting in real life"
                className="w-full h-full object-fit hover:scale-105 transition-transform duration-700"
              />
            </PrimaryGradient>
          </div>
        </div>
      </div>
    </section>
  );
}
