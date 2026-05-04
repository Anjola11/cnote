import clsx from 'clsx';
import type { Category } from '../../types';
import './Badge.css';

interface BadgeProps {
  category: Category;
  className?: string;
}

const BADGE_CONFIG = {
  programming: { icon: 'fa-solid fa-code', label: 'Programming', modifier: 'prog' },
  spiritual: { icon: 'fa-solid fa-book-bible', label: 'Spiritual', modifier: 'spirit' },
  general: { icon: 'fa-solid fa-feather', label: 'General', modifier: 'general' },
};

export default function Badge({ category, className }: BadgeProps) {
  const config = BADGE_CONFIG[category];
  return (
    <span className={clsx('badge', `badge--${config.modifier}`, className)}>
      <i className={config.icon} />
      <span>{config.label}</span>
    </span>
  );
}
