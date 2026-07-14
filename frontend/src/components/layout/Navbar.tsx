import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useNotes, useCreateNote } from '../../hooks/useNotes';
import Logo from '../ui/Logo';
import CategorySelectModal from '../ui/CategorySelectModal';
import type { Category } from '../../types';
import './Navbar.css';

interface NavbarProps {
  hideOnDesktop?: boolean;
  isEditor?: boolean;
}

export default function Navbar({ hideOnDesktop }: NavbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRendered, setSidebarRendered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notes } = useNotes();
  const createNote = useCreateNote();
  const [showNewModal, setShowNewModal] = useState(false);

  const handleCreate = (category: Category) => {
    setShowNewModal(false);
    setSidebarOpen(false);
    createNote.mutate(category);
  };

  const getInitials = () => {
    if (user?.display_name) {
      return user.display_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const initials = getInitials();

  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) {
      gsap.fromTo(dropdownRef.current,
        { opacity: 0, y: -8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Handle Sidebar Open/Close Animations
  useEffect(() => {
    if (sidebarOpen) {
      setSidebarRendered(true);
      document.body.style.overflow = 'hidden';
      // Small delay to allow the DOM to render the sidebar elements before animating
      setTimeout(() => {
        if (overlayRef.current && sidebarRef.current) {
          gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
          gsap.fromTo(sidebarRef.current, { x: '-100%' }, { x: '0%', duration: 0.3, ease: 'power2.out' });
        }
      }, 10);
    } else {
      document.body.style.overflow = '';
      if (sidebarRendered && sidebarRef.current && overlayRef.current) {
        gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
        gsap.to(sidebarRef.current, { x: '-100%', duration: 0.3, ease: 'power2.in', onComplete: () => setSidebarRendered(false) });
      }
    }
  }, [sidebarOpen]);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className={`navbar ${hideOnDesktop ? 'navbar--hide-desktop' : ''}`}>
        <div className="navbar__inner">
          <Link to="/feed" className="navbar__brand">
            <Logo className="navbar__logo" />
          </Link>

          <button className="navbar__hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <i className="fa-solid fa-bars" />
          </button>
        </div>
    </nav>

    {/* Sidebar Drawer */}
    {sidebarRendered && (
      <div className="sidebar-drawer">
        <div ref={overlayRef} className="sidebar-drawer__overlay" onClick={closeSidebar} />
        <div ref={sidebarRef} className="sidebar-drawer__content">
          <div className="sidebar-drawer__header">
            <Logo className="sidebar-drawer__logo" />
            <button className="sidebar-drawer__close" onClick={closeSidebar}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="sidebar-drawer__new-action">
            <button 
              className="sidebar-drawer__new-btn"
              onClick={() => {
                setSidebarOpen(false);
                setShowNewModal(true);
              }}
            >
              <i className="fa-solid fa-plus" /> New Note
            </button>
          </div>

          <div className="sidebar-drawer__main-nav">
            <Link to="/feed" className={`sidebar-drawer__link ${location.pathname === '/feed' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-house" /> Home
            </Link>
            <Link to="/forms" className={`sidebar-drawer__link ${location.pathname.startsWith('/forms') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-clipboard-list" /> Forms
            </Link>
          </div>

          <div className="sidebar-drawer__history">
            <span className="sidebar-drawer__section-title">Recent Notes</span>
            <div className="sidebar-drawer__history-list">
              {(notes?.slice(0, 8) || []).map((note) => (
                <Link
                  key={note.id}
                  to={`/editor/${note.id}`}
                  className="sidebar-drawer__history-item"
                  onClick={closeSidebar}
                >
                  <i className="fa-regular fa-file-lines" />
                  <span>{note.title || 'Untitled Note'}</span>
                </Link>
              ))}
            </div>
          </div>

          <nav className="sidebar-drawer__nav">
            <Link to="/profile" className={`sidebar-drawer__link ${location.pathname === '/profile' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-user-gear" /> Profile
            </Link>
            <Link to="/bin" className={`sidebar-drawer__link ${location.pathname === '/bin' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="fa-solid fa-trash-can" /> Bin
            </Link>
          </nav>
          <div className="sidebar-drawer__footer">
             <div className="sidebar-drawer__user">
               <div className="sidebar-drawer__avatar-group">
                 <div className="sidebar-drawer__avatar">
                   {user?.avatar_url ? (
                     <img src={user.avatar_url} alt={user.display_name || 'User'} />
                   ) : (
                     <span>{initials}</span>
                   )}
                 </div>
                 <div className="sidebar-drawer__user-info">
                   <strong>{user?.display_name || user?.email.split('@')[0]}</strong>
                   <span>{user?.email}</span>
                 </div>
               </div>
               <button className="sidebar-drawer__logout-icon" onClick={() => { closeSidebar(); handleLogout(); }} title="Log out">
                 <i className="fa-solid fa-arrow-right-from-bracket" />
               </button>
             </div>
          </div>
        </div>
      </div>
    )}

      <CategorySelectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSelect={handleCreate}
      />
    </>
  );
}
