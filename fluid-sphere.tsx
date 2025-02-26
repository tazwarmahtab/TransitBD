import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FluidSphereProps {
  isActive?: boolean;
  isAnimating?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  className?: string;
}

export function FluidSphere({ 
  isActive, 
  isAnimating, 
  isSpeaking, 
  isListening,
  className 
}: FluidSphereProps) {
  return (
    <motion.div
      className={cn(
        "relative w-32 h-32 rounded-full overflow-hidden",
        "bg-gradient-to-r from-purple-500 to-pink-500",
        "before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/10 before:to-transparent",
        "after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent",
        className
      )}
      animate={isActive ? {
        scale: [1, 1.1, 1],
        background: [
          "linear-gradient(45deg, rgb(147, 51, 234), rgb(219, 39, 119))",
          "linear-gradient(180deg, rgb(168, 85, 247), rgb(236, 72, 153))",
          "linear-gradient(225deg, rgb(192, 132, 252), rgb(249, 168, 212))"
        ]
      } : {}}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      {/* 3D rotating inner sphere */}
      <motion.div
        className="absolute inset-0"
        animate={{
          rotateX: [0, 180, 360],
          rotateY: [360, 180, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          background: `
            radial-gradient(
              circle at 30% 30%,
              rgba(255, 255, 255, 0.4) 0%,
              transparent 60%
            )
          `
        }}
      />

      {/* Dynamic color waves */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.6) 0%, transparent 70%)",
            "radial-gradient(circle at 70% 70%, rgba(219, 39, 119, 0.6) 0%, transparent 70%)",
            "radial-gradient(circle at 30% 70%, rgba(192, 132, 252, 0.6) 0%, transparent 70%)"
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Water ripple effects */}
      {(isAnimating || isSpeaking || isListening) && (
        <>
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: `
                radial-gradient(
                  circle at 50% 50%,
                  transparent 30%,
                  rgba(219, 39, 119, 0.3) 60%,
                  transparent 70%
                )
              `
            }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: [1.1, 1.3, 1.1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            style={{
              background: `
                radial-gradient(
                  circle at 50% 50%,
                  transparent 40%,
                  rgba(147, 51, 234, 0.2) 70%,
                  transparent 80%
                )
              `
            }}
          />
        </>
      )}

      {/* Speaking animation with color shifts */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 50% 50%, rgba(192, 132, 252, 0.4), transparent)",
              "radial-gradient(circle at 50% 50%, rgba(219, 39, 119, 0.4), transparent)",
              "radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.4), transparent)"
            ],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Listening state with ripple effect */}
      {isListening && (
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `
              radial-gradient(
                circle at 50% 50%,
                rgba(219, 39, 119, 0.4),
                transparent
              )
            `
          }}
        />
      )}

      {/* 3D depth highlights */}
      <motion.div
        className="absolute inset-0"
        animate={{
          rotateX: [10, -10, 10],
          rotateY: [-10, 10, -10],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(255, 255, 255, 0.2) 45%,
              rgba(255, 255, 255, 0.3) 50%,
              rgba(255, 255, 255, 0.2) 55%,
              transparent 100%
            )
          `
        }}
      />

      {/* Interactive wave effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "repeating-radial-gradient(circle at 50% 50%, transparent 0%, rgba(147, 51, 234, 0.1) 5%, transparent 10%)",
            "repeating-radial-gradient(circle at 50% 50%, transparent 5%, rgba(219, 39, 119, 0.1) 10%, transparent 15%)",
            "repeating-radial-gradient(circle at 50% 50%, transparent 0%, rgba(192, 132, 252, 0.1) 5%, transparent 10%)"
          ],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </motion.div>
  );
}