
import { motion } from "framer-motion";

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    willChange: "opacity, transform"
  },
  animate: {
    opacity: 1,
    y: 0,
    willChange: "opacity, transform"
  },
  exit: {
    opacity: 0,
    y: -20,
    willChange: "opacity, transform"
  },
};

export const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={{ 
      duration: 0.3, 
      ease: [0.4, 0, 0.2, 1],
      translateY: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    }}
  >
    {children}
  </motion.div>
);
