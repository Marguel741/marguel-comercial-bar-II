
import React from 'react';

interface SoftCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}

const SoftCard: React.FC<SoftCardProps> = ({ children, className = '', onClick, id }) => {
  return (
    <div 
      id={id}
      onClick={onClick}
      className={`soft-ui p-6 transition-all duration-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default SoftCard;
