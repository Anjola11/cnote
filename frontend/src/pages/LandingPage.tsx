import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ThemeToggle from '../components/ui/ThemeToggle';
import Button from '../components/ui/Button';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import FooterSection from '../components/landing/FooterSection';
import Logo from '../components/ui/Logo';
import './LandingPage.css';

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 'top -80px',
      onEnter: () => {
        if (navRef.current) {
          navRef.current.classList.add('landing-nav--scrolled');
        }
      },
      onLeaveBack: () => {
        if (navRef.current) {
          navRef.current.classList.remove('landing-nav--scrolled');
        }
      },
    });
    return () => trigger.kill();
  }, []);

  return (
    <div className="landing">
      <nav ref={navRef} className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand">
            <Logo className="landing-nav__logo" />
          </Link>

          <div className="landing-nav__right landing-nav__right--desktop">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>

          <div className="landing-nav__right landing-nav__right--mobile">
            <ThemeToggle />
            <button
              className="landing-nav__hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="landing-nav__mobile-menu slide-up-fade">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="md" fullWidth>Log in</Button>
            </Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" fullWidth>Get Started</Button>
            </Link>
          </div>
        )}
      </nav>

      <HeroSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}
