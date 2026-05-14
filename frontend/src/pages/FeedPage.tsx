import { useState, useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { isToday, isYesterday, format, parseISO } from 'date-fns';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import NoteCard from '../components/feed/NoteCard';
import CategoryFilter from '../components/feed/CategoryFilter';
import { useNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';
import { CATEGORY_OPTIONS } from '../types';
import type { Category } from '../types';
import Logo from '../components/ui/Logo';
import CnoteLoader from '../components/ui/CnoteLoader';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import './FeedPage.css';



export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const { data: notes, isLoading } = useNotes(activeCategory || undefined);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const cardsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Filter and sort by date descending
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    let list = [...notes];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(note =>
        note.title?.toLowerCase().includes(q) || note.content_text?.toLowerCase().includes(q)
      );
    }

    // Sort by updated_at descending
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [notes, search]);

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { [label: string]: typeof filteredNotes } = {};

    filteredNotes.forEach(note => {
      const date = parseISO(note.updated_at);
      const label = isToday(date)
        ? 'Today'
        : isYesterday(date)
          ? 'Yesterday'
          : format(date, 'MMMM d, yyyy');

      if (!groups[label]) groups[label] = [];
      groups[label].push(note);
    });

    return groups;
  }, [filteredNotes]);

  // GSAP card entrance
  useEffect(() => {
    if (cardsRef.current && filteredNotes.length > 0) {
      gsap.fromTo(
        cardsRef.current.children,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, [filteredNotes, activeCategory]);

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
    ? CATEGORY_OPTIONS.find(c => c.value === activeCategory)?.title || 'Notes'
    : 'All Notes';

  const countLabel = filteredNotes.length === 1 ? '1 note' : `${filteredNotes.length} notes`;



  const handleDelete = () => {
    if (showDeleteModal) {
      const id = showDeleteModal;
      setShowDeleteModal(null);
      deleteNote.mutate(id);
    }
  };

  if (createNote.isPending) {
    return <CnoteLoader />;
  }

  return (
    <div className="feed-page">
      <Navbar hideOnDesktop />

      <DesktopSidebar />

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
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

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

        {!isLoading && filteredNotes.length > 0 && (
          <div ref={cardsRef} className="feed-groups">
            {Object.entries(groupedNotes).map(([label, group]) => (
              <div key={label} className="feed-group">
                <h3 className="feed-group__header">{label}</h3>
                <div className="feed-grid">
                  {group.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onDelete={(id) => setShowDeleteModal(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredNotes.length === 0 && (
          <div className="feed-empty">
            <i className="fa-solid fa-book-open feed-empty__icon" />
            <h2 className="feed-empty__title">Nothing here yet</h2>
            <p className="feed-empty__sub">
              {search ? 'No notes match your search.' : "Tap 'New Note' to start writing."}
            </p>
            {!search && (
              <p>Try creating your first note!</p>
            )}
          </div>
        )}
      </main>





      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => {
          setShowDeleteModal(null);
        }}
        title="Delete note?"
      >
        <p className="feed-page__delete-modal-text">
          This cannot be undone. The note and all its content will be permanently deleted.
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
          <Button variant="danger" size="md" onClick={handleDelete} loading={deleteNote.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
