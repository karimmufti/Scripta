import { Mic } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };
  
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 36,
  };

  return (
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
        <Mic className="text-primary" size={iconSizes[size]} />
      </div>
      <span className={`font-semibold gradient-text ${sizeClasses[size]}`}>
        TableRead.io
      </span>
    </div>
  );
}
