import React from 'react';
import clsx from 'clsx';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isIconOnly = icon && !children;

  return (
    <button
      className={clsx(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full',
        isIconOnly && 'btn--icon-only',
        loading && 'btn--loading',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <i className="fa-solid fa-spinner fa-spin btn__spinner" />
      ) : (
        <>
          {icon && <i className={clsx(icon, 'btn__icon')} />}
          {children && <span className="btn__text">{children}</span>}
        </>
      )}
    </button>
  );
}
