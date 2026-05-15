import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotes, useCreateNote } from '../../hooks/useNotes';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CategorySelectModal from '../ui/CategorySelectModal';
import { CATEGORY_OPTIONS } from '../../types';
import type { Category } from '../../types';
import './DesktopSidebar.css';

export default function DesktopSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: notes } = useNotes();
  const createNote = useCreateNote();
  const [showNewModal, setShowNewModal] = useState(false);

  const getInitials = () => {
    if (user?.display_name) return user.display_name.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return '?';
  };

  const handleCreate = (category: Category) => {
    setShowNewModal(false);
    createNote.mutate(category);
  };

  const initials = getInitials();
  const recentNotes = notes?.slice(0, 10) || [];

  return (
    <>
      <aside className="desktop-sidebar">
        <div className="desktop-sidebar__header">
          <Logo className="desktop-sidebar__logo" />
        </div>

        <div className="desktop-sidebar__new-action">
          <Button 
            variant="primary" 
            className="desktop-sidebar__new-btn" 
            icon="fa-solid fa-plus"
            onClick={() => setShowNewModal(true)}
            loading={createNote.isPending}
          >
            New Note
          </Button>
        </div>

        <div className="desktop-sidebar__main-nav">
          <Link to="/feed" className={`desktop-sidebar__link ${location.pathname === '/feed' ? 'active' : ''}`}>
            <i className="fa-solid fa-house" /> Home
          </Link>
        </div>

        <div className="desktop-sidebar__scrollable">
          <div className="desktop-sidebar__history">
            <span className="desktop-sidebar__section-title">Recent Notes</span>
            <div className="desktop-sidebar__history-list">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    to={`/editor/${note.id}`}
                    className={`desktop-sidebar__history-item ${location.pathname === `/editor/${note.id}` ? 'active' : ''}`}
                  >
                    <i className="fa-regular fa-file-lines" />
                    <span>{note.title || 'Untitled Note'}</span>
                  </Link>
                ))
              ) : (
                <p className="desktop-sidebar__history-empty">No recent notes</p>
              )}
            </div>
          </div>

          <div className="desktop-sidebar__section desktop-sidebar__section--nav">
            <Link to="/profile" className={`desktop-sidebar__link ${location.pathname === '/profile' ? 'active' : ''}`}>
              <i className="fa-solid fa-user-gear" /> Profile
            </Link>
            <Link to="/bin" className={`desktop-sidebar__link ${location.pathname === '/bin' ? 'active' : ''}`}>
              <i className="fa-solid fa-trash-can" /> Bin
            </Link>
          </div>
        </div>

        <div className="desktop-sidebar__footer">
          <div className="desktop-sidebar__user">
            <div className="desktop-sidebar__avatar-group">
              <div className="desktop-sidebar__avatar">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name || 'User'} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="desktop-sidebar__user-info">
                <strong>{user?.display_name || user?.email.split('@')[0]}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
            <button className="desktop-sidebar__logout-icon" onClick={logout} title="Log out">
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </button>
          </div>
        </div>
      </aside>

      <CategorySelectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSelect={handleCreate}
      />
    </>
  );
}
