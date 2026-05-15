import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import './Navbar.css';

export default function PublicNavbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar navbar--public ${scrolled ? 'navbar--scrolled' : 'navbar--transparent'}`}>
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <Logo className="navbar__logo" />
        </Link>

        <div className="navbar__actions">
          {user ? (
            <Link to="/feed">
              <Button variant="primary" size="sm" icon="fa-solid fa-house">
                Dashboard
              </Button>
            </Link>
          ) : (
            <div className="navbar__guest-actions">
              <Link to="/login" className="hide-mobile">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
