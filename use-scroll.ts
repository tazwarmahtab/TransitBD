import { useState, useEffect, useRef } from 'react';

export function useScroll() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY < 10);

      if (currentScrollY > lastScrollYRef.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollYRef.current) {
        setScrollDirection('up');
      }

      lastScrollYRef.current = currentScrollY;
    };

    // Set initial value
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { scrollDirection, isAtTop };
}