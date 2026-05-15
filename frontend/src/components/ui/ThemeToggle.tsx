import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`theme-toggle-wrapper theme-toggle--${theme}`} onClick={toggleTheme}>
      <div className="theme-toggle__icons">
        <i className="fa-solid fa-sun theme-toggle-indicator theme-toggle-indicator--sun" />
        <i className="fa-solid fa-desktop theme-toggle-indicator theme-toggle-indicator--system" />
        <i className="fa-solid fa-moon theme-toggle-indicator theme-toggle-indicator--moon" />
      </div>
      <div className="theme-toggle__track">
        <div className="theme-toggle__thumb" />
      </div>
    </div>
  );
}
