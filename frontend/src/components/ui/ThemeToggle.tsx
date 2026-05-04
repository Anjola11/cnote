import { useRef } from 'react';
import { gsap } from 'gsap';
import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    toggleTheme();
    if (btnRef.current) {
      gsap.fromTo(btnRef.current,
        { rotate: 0, scale: 1 },
        {
          rotate: 360, scale: 1.15,
          duration: 0.4, ease: 'back.out(1.7)',
          onComplete: () => gsap.set(btnRef.current, { rotate: 0 }),
        }
      );
    }
  };

  return (
    <button
      ref={btnRef}
      className="theme-toggle"
      onClick={handleClick}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <i className="fa-solid fa-sun theme-toggle__icon theme-toggle__icon--sun" />
      ) : (
        <i className="fa-solid fa-moon theme-toggle__icon theme-toggle__icon--moon" />
      )}
    </button>
  );
}
