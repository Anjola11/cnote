import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getUserErrorMessage } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, delay: 0.15, ease: 'power2.out' }
      );
    }
    if (brandRef.current) {
      gsap.fromTo(
        brandRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, delay: 0.1, ease: 'power3.out' }
      );
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (err: any) {
      const raw = (err.response?.data?.message || err.response?.data?.detail || '');
      const lower = raw.toLowerCase();
      if (lower.includes('not verified') || lower.includes('verify your') || lower.includes('account not verified')) {
        const uidMatch = raw.match(/\[UID:([a-f0-9-]+)\]/i);
        const uid = uidMatch ? uidMatch[1] : null;
        
        toast.error('Please verify your email to continue.');
        navigate('/verify', { state: { email, uid } });
      } else {
        toast.error(getUserErrorMessage(err, 'Login failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Mobile accent bar */}
      <div className="login-page__accent-bar" />

      {/* Left brand panel (desktop only) */}
      <div className="login-page__brand" ref={brandRef}>
        <div className="login-page__brand-content">
          <h1 className="login-page__brand-headline" style={{ opacity: 0 }}>
            <em>"Words outlast everything."</em>
          </h1>
          <div className="login-page__brand-features" style={{ opacity: 0 }}>
            <div className="login-page__brand-feature">
              <i className="fa-solid fa-lock-open" />
              <span>Private and secure</span>
            </div>
            <div className="login-page__brand-feature">
              <i className="fa-solid fa-bolt" />
              <span>Instant autosave</span>
            </div>
            <div className="login-page__brand-feature">
              <i className="fa-solid fa-palette" />
              <span>Beautiful by default</span>
            </div>
          </div>
        </div>
        <i className="fa-solid fa-feather-pointed login-page__brand-deco" />
      </div>

      {/* Right form panel */}
      <div className="login-page__form-panel">
        <div className="login-page__form-container" ref={formRef}>
          <Link to="/" className="login-page__logo" style={{ opacity: 0 }}>
            <Logo />
          </Link>

          <h2 className="login-page__heading" style={{ opacity: 0 }}>Welcome back</h2>
          <p className="login-page__sub" style={{ opacity: 0 }}>
            Don't have an account?{' '}
            <Link to="/signup" className="login-page__link">Sign up →</Link>
          </p>

          <form onSubmit={handleSubmit} style={{ opacity: 0 }}>
            <div className="login-page__fields">
              <Input
                label="Email address"
                icon="fa-solid fa-envelope"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                icon="fa-solid fa-lock"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div className="login-page__forgot">
                <a href="#" className="login-page__link">Forgot password?</a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon="fa-solid fa-arrow-right-to-bracket"
              >
                Log in
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
