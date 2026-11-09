import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import { PopularLocations } from "@/components/PopularLocations";
import Footer from "@/components/Footer";
import { GlobalAnnouncementBanner } from "@/components/GlobalAnnouncementBanner";
import { useAuth } from "../context/AuthContext";

import { useAuthStore } from "@/stores/authStore";

export function Home({ setOpenLogin }) {
  const { user, profiledata } = useAuth();
  const onboardingInProgress = useAuthStore(
    (state) => state.onboardingInProgress,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !profiledata) {
      navigate('/');
      return;
    }

    // The signup flow owns routing until its onboarding step mounts.
    if (onboardingInProgress) {
      return;
    }

    navigate('/dashboard');
  }, [user, profiledata, onboardingInProgress, navigate])

  return (
    <div>
      <main>
        {!user && <GlobalAnnouncementBanner />}
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
