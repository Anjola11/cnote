import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import FooterSection from '../components/landing/FooterSection';
import PublicNavbar from '../components/layout/PublicNavbar';
import SEO from '../components/common/SEO';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <SEO />
      <PublicNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
      <FooterSection />
    </div>
  );
}
