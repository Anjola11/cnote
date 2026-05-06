import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import './Navbar.css';

export default function Navbar() {
  const { user, isDemo, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) {
      gsap.fromTo(dropdownRef.current,
        { opacity: 0, y: -8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/feed" className="navbar__brand">
          <Logo className="navbar__logo" />
          {isDemo && <span className="navbar__demo-badge">DEMO</span>}
        </Link>

        <div className="navbar__right">
          <ThemeToggle />
          <div className="navbar__avatar-wrapper">
            <button
              className="navbar__avatar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLButtonElement).blur();
                setDropdownOpen(!dropdownOpen);
              }}
              aria-label="User menu"
            >
              {initials}
            </button>
            {dropdownOpen && (
              <div ref={dropdownRef} className="navbar__dropdown">
                <div className="navbar__dropdown-user">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
                <div className="navbar__dropdown-divider" />
                <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); }}>
                  <i className="fa-solid fa-gear" />
                  <span>Settings</span>
                </button>
                <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                  <i className="fa-solid fa-arrow-right-from-bracket" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
