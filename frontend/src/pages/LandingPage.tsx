import { useRef, useEffect } from 'react';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import FooterSection from '../components/landing/FooterSection';
import PublicNavbar from '../components/layout/PublicNavbar';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SEO from '../components/common/SEO';
import './LandingPage.css';

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null);

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
      <SEO />
      <PublicNavbar />
      <HeroSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}
