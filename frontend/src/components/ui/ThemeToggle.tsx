import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { preferencesApi } from '../../services/api';
import type { Theme } from '../../types';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('cnote-theme', newTheme);
    if (user) {
      preferencesApi.update('theme', newTheme).catch(() => {});
    }
  };

  const getTranslateX = () => {
    if (theme === 'system') return 'calc(100% + 4px)';
    if (theme === 'dark') return 'calc(200% + 8px)';
    return '0%';
  };

  const options: { value: Theme; icon: string; label: string }[] = [
    { value: 'light', icon: 'fa-sun', label: 'Light' },
    { value: 'system', icon: 'fa-desktop', label: 'System' },
    { value: 'dark', icon: 'fa-moon', label: 'Dark' },
  ];

  return (
    <div className="segmented-control">
      <div 
        className="segmented-control__thumb" 
        style={{ transform: `translateX(${getTranslateX()})` }} 
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segmented-control__option ${theme === opt.value ? 'segmented-control__option--active' : ''}`}
          onClick={() => handleThemeChange(opt.value)}
          aria-label={opt.label}
        >
          <i className={`fa-solid ${opt.icon}`} />
        </button>
      ))}
    </div>
  );
}
