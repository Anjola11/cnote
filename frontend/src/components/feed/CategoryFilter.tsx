import clsx from 'clsx';
import type { Category } from '../../types';
import './CategoryFilter.css';

interface CategoryFilterProps {
  active: Category | null;
  onChange: (category: Category | null) => void;
  variant?: 'sidebar' | 'chips';
}

const FILTERS: { value: Category | null; icon: string; label: string; color?: string }[] = [
  { value: null, icon: 'fa-solid fa-layer-group', label: 'All Entries' },
  { value: 'general', icon: 'fa-solid fa-feather', label: 'General', color: 'var(--cat-general)' },
  { value: 'programming', icon: 'fa-solid fa-code', label: 'Programming', color: 'var(--cat-prog)' },
  { value: 'spiritual', icon: 'fa-solid fa-book-bible', label: 'Spiritual', color: 'var(--cat-spirit)' },
];

export default function CategoryFilter({ active, onChange, variant = 'sidebar' }: CategoryFilterProps) {
  return (
    <div className={clsx('category-filter', `category-filter--${variant}`)}>
      {FILTERS.map(f => (
        <button
          key={f.label}
          className={clsx(
            'category-filter__item',
            active === f.value && 'category-filter__item--active'
          )}
          onClick={(e) => {
            e.preventDefault();
            onChange(f.value);
          }}
          style={active === f.value && f.color ? { '--active-color': f.color } as any : undefined}
        >
          <i className={f.icon} style={f.color ? { color: f.color } : undefined} />
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}
