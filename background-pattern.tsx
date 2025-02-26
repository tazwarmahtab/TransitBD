import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export function BackgroundPattern() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  // Smooth spring animation for cursor glow with optimized settings
  const glowX = useSpring(cursorX, { damping: 25, stiffness: 200 });
  const glowY = useSpring(cursorY, { damping: 25, stiffness: 200 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background -z-10">
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Enhanced Islamic geometric pattern */}
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern 
              id="IslamicPattern" 
              x="0" 
              y="0" 
              width="32" 
              height="32" 
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              {/* Main square */}
              <path 
                d="M16 0L32 16L16 32L0 16z" 
                fill="none" 
                stroke="rgb(75, 75, 75)" 
                strokeWidth="0.4" 
                opacity="0.2"
              />
              {/* Inner square */}
              <path 
                d="M24 16L16 24L8 16L16 8z" 
                fill="none" 
                stroke="rgb(100, 100, 100)" 
                strokeWidth="0.4" 
                opacity="0.15"
              />
              {/* Central circle */}
              <circle 
                cx="16" 
                cy="16" 
                r="4" 
                fill="none" 
                stroke="rgb(120, 120, 120)" 
                strokeWidth="0.4" 
                opacity="0.1"
              />
              {/* Diagonal lines */}
              <path
                d="M0 0L32 32M32 0L0 32"
                stroke="rgb(90, 90, 90)"
                strokeWidth="0.3"
                opacity="0.1"
              />
              {/* Additional decorative elements */}
              <circle 
                cx="16" 
                cy="16" 
                r="2" 
                fill="none" 
                stroke="rgb(130, 130, 130)" 
                strokeWidth="0.3" 
                opacity="0.1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#IslamicPattern)" />
        </svg>

        {/* Interactive Cursor Glow Effect */}
        <motion.div
          className="absolute w-[200px] h-[200px] rounded-full will-change-transform"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
            x: glowX,
            y: glowY,
            translateX: "-50%",
            translateY: "-50%",
            filter: "blur(8px)",
            mixBlendMode: "screen",
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 200,
          }}
        />
      </motion.div>
    </div>
  );
}