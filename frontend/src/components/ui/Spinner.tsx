import clsx from 'clsx';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <i className={clsx('fa-solid fa-spinner fa-spin spinner', `spinner--${size}`, className)} />
  );
}
