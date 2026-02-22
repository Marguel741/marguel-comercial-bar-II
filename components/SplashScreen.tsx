
import React from 'react';
import { MGLogo } from '../constants';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
      <div className="w-32 h-32 mb-6 relative">
        <MGLogo className="w-full h-full animate-logo-scale" />
      </div>
      <div className="overflow-hidden h-12">
        <h1 className="text-2xl font-bold text-[#003366] animate-fade-slide-up">
          MARGUEL COMERCIAL BAR
        </h1>
      </div>
      
      <style>{`
        .animate-logo-scale {
          animation: logoScale 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes logoScale {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 0.8s ease-out 0.8s both;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
