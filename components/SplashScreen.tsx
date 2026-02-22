import React, { useEffect } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    // Simula 1s e vai para App
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <img
        src="/assets/splash-fallback.png"
        alt="Splash Fallback"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

export default SplashScreen;
