import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi, getUserErrorMessage } from '../services/api';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import './VerifyOtpPage.css';

const OTP_LENGTH = 6;

export default function VerifyOtpPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; uid?: string } | null;

  const verifyEmail = user?.email || state?.email;
  const verifyUid = user?.uid || state?.uid;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  const focusOtpIndex = useCallback((index: number) => {
    inputRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();
  }, []);

  const applyOtpDigits = useCallback((digits: string, startIndex = 0) => {
    const sanitized = digits.replace(/\D/g, '');
    if (!sanitized) {
      return false;
    }

    const normalized = [...otp];
    let cursor = Math.min(Math.max(startIndex, 0), OTP_LENGTH - 1);

    for (const char of sanitized) {
      if (cursor >= OTP_LENGTH) break;
      normalized[cursor] = char;
      cursor += 1;
    }

    setOtp(normalized);

    const nextEmpty = normalized.findIndex(value => !value);
    focusOtpIndex(nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty);
    return true;
  }, [focusOtpIndex, otp]);

  // If user is already verified, go to feed
  useEffect(() => {
    if (user?.is_verified) {
      navigate('/feed', { replace: true });
    }
  }, [user, navigate]);

  // Entrance animation
  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, delay: 0.15, ease: 'power2.out' }
      );
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    if (digitsOnly.length > 1) {
      applyOtpDigits(digitsOnly, index);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digitsOnly;
    setOtp(newOtp);

    if (index < OTP_LENGTH - 1) {
      focusOtpIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      focusOtpIndex(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusOtpIndex(index - 1);
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusOtpIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const applied = applyOtpDigits(pasted, index);
    if (!applied) {
      toast.error('Paste a valid 6-digit verification code.');
    }
  };

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }
    if (!verifyUid) {
      toast.error('Session lost. Please sign up or log in again.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(verifyUid, code, 'signup');
      setUser(res.data.data);
      toast.success('Email verified successfully!');
      navigate('/feed', { replace: true });
    } catch (err: any) {
      toast.error(getUserErrorMessage(err, 'Invalid OTP. Please try again.'));
      // Clear inputs on failure
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otp, user, setUser, navigate]);

  const handleResend = async () => {
    if (cooldown > 0 || !verifyEmail) return;
    setResending(true);
    try {
      await authApi.resendOtp(verifyEmail, 'signup');
      toast.success('A new OTP has been sent to your email.');
      setCooldown(60);
    } catch (err: any) {
      toast.error(getUserErrorMessage(err, 'Failed to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  if (!verifyEmail || !verifyUid) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="verify-page">
      <div className="verify-page__accent-bar" />
      <div className="verify-page__container" ref={formRef}>
        <Link to="/" className="verify-page__logo" style={{ opacity: 0 }}>
          <Logo />
        </Link>

        <div className="verify-page__icon-wrapper" style={{ opacity: 0 }}>
          <i className="fa-solid fa-envelope-circle-check" />
        </div>

        <h2 className="verify-page__heading" style={{ opacity: 0 }}>Verify your email</h2>
        <p className="verify-page__sub" style={{ opacity: 0 }}>
          We sent a 6-digit code to <strong>{verifyEmail}</strong>. Enter it below to activate your account.
        </p>

        <div className="verify-page__otp-inputs" style={{ opacity: 0 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="verify-page__otp-input"
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={e => handlePaste(e, i)}
              onFocus={e => e.currentTarget.select()}
              autoComplete="one-time-code"
              aria-label={`OTP digit ${i + 1}`}
              pattern="[0-9]*"
            />
          ))}
        </div>

        <div style={{ opacity: 0 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleVerify}
            icon="fa-solid fa-check-circle"
          >
            Verify Account
          </Button>
        </div>

        <div className="verify-page__resend" style={{ opacity: 0 }}>
          <span>Didn't receive the code?</span>
          <button
            className="verify-page__resend-btn"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>

        <p className="verify-page__hint" style={{ opacity: 0 }}>
          Check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  );
}
