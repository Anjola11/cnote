import { useState, useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { isToday, isYesterday, format, parseISO } from 'date-fns';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EntryCard from '../components/feed/EntryCard';
import CategoryFilter from '../components/feed/CategoryFilter';
import { useEntries, useCreateEntry, useDeleteEntry } from '../hooks/useEntries';
import type { Category } from '../types';
import Logo from '../components/ui/Logo';
import './FeedPage.css';

const CATEGORY_OPTIONS: { value: Category; icon: string; title: string; sub: string }[] = [
  { value: 'programming', icon: 'fa-solid fa-code', title: 'Programming', sub: 'Code snippets, technical notes, dev logs.' },
  { value: 'spiritual', icon: 'fa-solid fa-book-bible', title: 'Spiritual', sub: 'Reflections, devotionals, scripture notes.' },
  { value: 'general', icon: 'fa-solid fa-feather', title: 'General', sub: 'Thoughts, plans, life notes.' },
];

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const { data: entries, isLoading } = useEntries(activeCategory || undefined);
  const createEntry = useCreateEntry();
  const deleteEntry = useDeleteEntry();

  const cardsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Filter and sort by date descending
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q)
      );
    }

    // Sort by updated_at descending
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [entries, search]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [label: string]: typeof filteredEntries } = {};

    filteredEntries.forEach(entry => {
      const date = parseISO(entry.updated_at);
      const label = isToday(date)
        ? 'Today'
        : isYesterday(date)
          ? 'Yesterday'
          : format(date, 'MMMM d, yyyy');

      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });

    return groups;
  }, [filteredEntries]);

  // GSAP card entrance
  useEffect(() => {
    if (cardsRef.current && filteredEntries.length > 0) {
      gsap.fromTo(
        cardsRef.current.children,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, [filteredEntries, activeCategory]);

  // FAB entrance
  useEffect(() => {
    if (fabRef.current) {
      gsap.fromTo(fabRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.5 }
      );
    }
  }, []);

  const categoryLabel = activeCategory
    ? CATEGORY_OPTIONS.find(c => c.value === activeCategory)?.title || 'Entries'
    : 'All Entries';

  const countLabel = filteredEntries.length === 1 ? '1 entry' : `${filteredEntries.length} entries`;

  const handleCreate = (category: Category) => {
    setShowNewModal(false);
    createEntry.mutate(category);
  };

  const handleDelete = () => {
    if (showDeleteModal) {
      const id = showDeleteModal;
      setShowDeleteModal(null);
      deleteEntry.mutate(id);
    }
  };

  return (
    <div className="feed-page">
      <Navbar />

      {/* Desktop sidebar */}
      <aside className="feed-sidebar">
        <div className="feed-sidebar__header">
          <Logo className="feed-sidebar__logo" />
        </div>
        <Button
          variant="primary"
          size="md"
          icon="fa-solid fa-plus"
          fullWidth
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            setShowNewModal(true);
          }}
        >
          New Entry
        </Button>
        <div className="feed-sidebar__filters">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} variant="sidebar" />
        </div>
      </aside>

      {/* Main content */}
      <main className="feed-main">
        <div className="feed-main__header">
          <div>
            <h1 className="feed-main__title">{categoryLabel}</h1>
            <span className="feed-main__count">{countLabel}</span>
          </div>
          <div className="feed-main__search">
            <i className="fa-solid fa-magnifying-glass feed-main__search-icon" />
            <input
              type="text"
              className="feed-main__search-input"
              placeholder="Search entries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile category chips */}
        <div className="feed-main__chips">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} variant="chips" />
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="feed-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card feed-skeleton">
                <div className="skeleton feed-skeleton__line feed-skeleton__line--badge" />
                <div className="skeleton feed-skeleton__line feed-skeleton__line--title" />
                <div className="skeleton feed-skeleton__line feed-skeleton__line--body" />
                <div className="skeleton feed-skeleton__line feed-skeleton__line--body-short" />
              </div>
            ))}
          </div>
        )}

        {/* Entry cards grouped by date */}
        {!isLoading && filteredEntries.length > 0 && (
          <div ref={cardsRef} className="feed-groups">
            {Object.entries(groupedEntries).map(([label, group]) => (
              <div key={label} className="feed-group">
                <h3 className="feed-group__header">{label}</h3>
                <div className="feed-grid">
                  {group.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={(id) => setShowDeleteModal(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredEntries.length === 0 && (
          <div className="feed-empty">
            <i className="fa-solid fa-book-open feed-empty__icon" />
            <h2 className="feed-empty__title">Nothing here yet</h2>
            <p className="feed-empty__sub">
              {search ? 'No entries match your search.' : "Tap 'New Entry' to start writing."}
            </p>
            {!search && (
              <Button
                variant="primary"
                size="md"
                icon="fa-solid fa-plus"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  (e.currentTarget as HTMLButtonElement).blur();
                  setShowNewModal(true);
                }}
              >
                New Entry
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Mobile FAB */}
      <button
        ref={fabRef}
        className="feed-fab"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLButtonElement).blur();
          setShowNewModal(true);
        }}
        aria-label="New entry"
      >
        <i className="fa-solid fa-plus" />
      </button>

      {/* New Entry Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => {
          setShowNewModal(false);
        }}
        title="What kind of entry?"
      >
        <div className="feed-new-modal__options">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className="feed-new-modal__option"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCreate(opt.value);
              }}
            >
              <div className={`feed-new-modal__option-icon feed-new-modal__option-icon--${opt.value}`}>
                <i className={opt.icon} />
              </div>
              <div className="feed-new-modal__option-text">
                <strong>{opt.title}</strong>
                <span>{opt.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => {
          setShowDeleteModal(null);
        }}
        title="Delete entry?"
      >
        <p className="feed-page__delete-modal-text">
          This cannot be undone. The entry and all its content will be permanently deleted.
        </p>
        <div className="feed-page__delete-modal-actions">
          <Button
            variant="ghost"
            size="md"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLButtonElement).blur();
              setShowDeleteModal(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={handleDelete} loading={deleteEntry.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
