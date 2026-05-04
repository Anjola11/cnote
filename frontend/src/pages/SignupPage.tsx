import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import './SignupPage.css';

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#EF4444', '#F97316', '#EAB308', 'var(--success)'];

export default function SignupPage() {
  const { signup, enterDemo } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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
    if (passwordMismatch) return;
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    enterDemo();
    navigate('/feed');
  };

  return (
    <div className="signup-page">
      <div className="signup-page__accent-bar" />

      {/* Brand panel */}
      <div className="signup-page__brand" ref={brandRef}>
        <div className="signup-page__brand-content">
          <h1 className="signup-page__brand-headline" style={{ opacity: 0 }}>
            <em>"Start your story today."</em>
          </h1>
          <div className="signup-page__brand-features" style={{ opacity: 0 }}>
            <div className="signup-page__brand-feature">
              <i className="fa-solid fa-lock-open" />
              <span>Private and secure</span>
            </div>
            <div className="signup-page__brand-feature">
              <i className="fa-solid fa-bolt" />
              <span>Instant autosave</span>
            </div>
            <div className="signup-page__brand-feature">
              <i className="fa-solid fa-palette" />
              <span>Beautiful by default</span>
            </div>
          </div>
        </div>
        <i className="fa-solid fa-feather-pointed signup-page__brand-deco" />
      </div>

      {/* Form panel */}
      <div className="signup-page__form-panel">
        <div className="signup-page__form-container" ref={formRef}>
          <Link to="/" className="signup-page__logo" style={{ opacity: 0 }}>
            <Logo />
          </Link>

          <h2 className="signup-page__heading" style={{ opacity: 0 }}>Create your account</h2>
          <p className="signup-page__sub" style={{ opacity: 0 }}>
            Already have an account?{' '}
            <Link to="/login" className="signup-page__link">Log in</Link>
          </p>

          <form onSubmit={handleSubmit} style={{ opacity: 0 }}>
            <div className="signup-page__fields">
              <Input
                label="Full Name"
                icon="fa-solid fa-user"
                type="text"
                placeholder="Alex Okafor"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                required
              />
              <Input
                label="Email address"
                icon="fa-solid fa-envelope"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
              />
              <div>
                <Input
                  label="Password"
                  icon="fa-solid fa-lock"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  required
                  minLength={8}
                />
                {password.length > 0 && (
                  <div className="signup-page__strength">
                    <div className="signup-page__strength-bar">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="signup-page__strength-segment"
                          style={{ background: i <= strength ? STRENGTH_COLORS[strength] : undefined }}
                        />
                      ))}
                    </div>
                    <span className="signup-page__strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                )}
              </div>
              <Input
                label="Confirm Password"
                icon="fa-solid fa-lock"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                error={passwordMismatch ? 'Passwords do not match' : undefined}
                required
              />

              {error && (
                <div className="signup-page__error-banner">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon="fa-solid fa-user-plus"
              >
                Create account
              </Button>
            </div>
          </form>

          <p className="signup-page__terms" style={{ opacity: 0 }}>
            By signing up, you agree to our Terms and Privacy Policy.
          </p>

          {/* Demo link */}
          <div className="signup-page__demo" style={{ opacity: 0 }}>
            <button className="signup-page__demo-link" onClick={handleDemo}>
              <i className="fa-solid fa-wand-magic-sparkles" />
              Or try the demo first →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
