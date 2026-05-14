import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PublicNavbar from '../components/layout/PublicNavbar';
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
      <PublicNavbar />
      <HeroSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}
