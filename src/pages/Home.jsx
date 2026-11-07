import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import { PopularLocations } from "@/components/PopularLocations";
import Footer from "@/components/Footer";
import { useAuth } from "../context/AuthContext";

export function Home({ setOpenLogin }) {
  const {user, profiledata} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profiledata) {
        navigate('/dashboard')
    } else {
        navigate('/')
    }
  }, [user, profiledata])

  return (
    <div>
      <main>
        <HeroSection 
          setOpenLogin={setOpenLogin}
        />
        <AboutSection />
        <PopularLocations />
      </main>
      <Footer />
    </div>
  );
}
