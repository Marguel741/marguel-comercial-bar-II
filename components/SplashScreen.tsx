import React, { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    setAnimationStarted(true);
    const timer = setTimeout(onComplete, 5000); // Extended slightly for effect
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020408] overflow-hidden">
      {/* Cinematic Background with Zoom */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#020408] to-[#000000] animate-zoom-in" />

      <div className="relative z-10 flex flex-col items-center">
        {/* SVG Logo Animation */}
        <div className="w-80 h-60 mb-10 relative filter drop-shadow-[0_0_25px_rgba(37,99,235,0.3)]">
          <svg viewBox="0 0 340 240" className="w-full h-full">
            <defs>
              <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2E8F0" /> {/* slate-200 */}
                <stop offset="50%" stopColor="#3B82F6" /> {/* blue-500 */}
                <stop offset="100%" stopColor="#1E40AF" /> {/* blue-800 */}
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Balanced M - 100x120 */}
            <path
              d="M 50 180 V 60 L 100 110 L 150 60 V 180"
              fill="none"
              stroke="url(#premiumGradient)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`animate-draw ${animationStarted ? 'opacity-100' : 'opacity-0'}`}
              style={{ 
                strokeDasharray: 700, 
                strokeDashoffset: 700,
                animationDelay: '0.3s',
                animationDuration: '2.5s',
                filter: 'url(#glow)'
              }}
            />

            {/* Balanced G - 100x120 */}
            <path
              d="M 290 75 A 50 60 0 1 0 290 165 L 290 120 H 240"
              fill="none"
              stroke="url(#premiumGradient)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`animate-draw ${animationStarted ? 'opacity-100' : 'opacity-0'}`}
              style={{ 
                strokeDasharray: 700, 
                strokeDashoffset: 700,
                animationDelay: '1.5s',
                animationDuration: '2.5s',
                filter: 'url(#glow)'
              }}
            />
          </svg>
        </div>

        {/* Text Animation - Elegant & Premium */}
        <div className="overflow-hidden text-center relative w-full px-4">
          <h1 
            className="text-2xl md:text-4xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-white to-slate-300 tracking-[0.3em] uppercase opacity-0 animate-fade-in-up whitespace-nowrap"
            style={{ 
              animationDelay: '3.2s', 
              animationFillMode: 'forwards',
              fontFamily: '"Outfit", sans-serif'
            }}
          >
            Marguel Sistema de Gestão Interna
          </h1>
          
          {/* Animated Underline */}
          <div 
            className="h-[2px] bg-gradient-to-r from-transparent via-blue-600 to-transparent w-full mt-6 opacity-0 animate-fade-in-up"
            style={{ 
              animationDelay: '3.6s', 
              animationFillMode: 'forwards',
              boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
