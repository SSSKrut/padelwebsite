import { ReactNode } from "react";

interface HeroProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  backgroundImage?: string;
  compact?: boolean;
}

export const Hero = ({ title, subtitle, children, backgroundImage, compact = false }: HeroProps) => {
  return (
    <section
      className={`relative ${compact ? 'h-[40vh] min-h-[300px]' : 'h-[60vh] min-h-[400px]'} flex items-center justify-center overflow-hidden`}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        </div>
      )}
      
      <div className="relative z-10 text-center px-4 max-w-4xl animate-scale-in">
        <h1 className={`${compact ? 'text-4xl md:text-5xl' : 'text-5xl md:text-7xl'} font-bold mb-4 text-white drop-shadow-lg`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`${compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'} text-white/90 mb-6 drop-shadow`}>
            {subtitle}
          </p>
        )}
        {children && <div className="flex flex-wrap gap-4 justify-center">{children}</div>}
      </div>
    </section>
  );
};
