import Logo from '../ui/Logo';
import './FooterSection.css';

export default function FooterSection() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo className="footer__logo" />
          <span className="footer__tagline">Write. Reflect. Grow.</span>
        </div>
        <div className="footer__links">
          <a href="#" className="footer__link">Privacy</a>
          <a href="#" className="footer__link">Terms</a>
          <span className="footer__made">
            Made by <a href="https://aanu-aladeniyi.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer__credit-link">
              Aanu <i className="fa-solid fa-up-right-from-square footer__link-icon" />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
