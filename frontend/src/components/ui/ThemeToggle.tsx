import { useTheme } from '../../hooks/useTheme';
import Switch from './Switch';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle-wrapper">
      <i className="fa-solid fa-sun theme-toggle-indicator theme-toggle-indicator--sun" />
      <Switch 
        checked={theme === 'dark'} 
        onChange={toggleTheme} 
        id="theme-switch"
      />
      <i className="fa-solid fa-moon theme-toggle-indicator theme-toggle-indicator--moon" />
    </div>
  );
}
