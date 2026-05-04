import React, { useState, useId, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { gsap } from 'gsap';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export default function Input({
  label,
  error,
  icon,
  type = 'text',
  className,
  ...props
}: InputProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(errorRef.current,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.2 }
      );
    }
  }, [error]);

  return (
    <div className={clsx('input-group', error && 'input-group--error', className)}>
      {label && (
        <label htmlFor={id} className="input-group__label">{label}</label>
      )}
      <div className="input-group__wrapper">
        {icon && <i className={clsx(icon, 'input-group__icon')} />}
        <input
          id={id}
          type={inputType}
          className={clsx('input-group__input', icon && 'input-group__input--with-icon')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-group__toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <i className={clsx('fa-solid', showPassword ? 'fa-eye-slash' : 'fa-eye')} />
          </button>
        )}
      </div>
      {error && (
        <div ref={errorRef} className="input-group__error">
          <i className="fa-solid fa-circle-exclamation" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
