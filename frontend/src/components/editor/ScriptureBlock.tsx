import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ScriptureVerse } from '../../types';
import './ScriptureBlock.css';

interface ScriptureBlockProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (verse: ScriptureVerse) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export default function ScriptureBlock({ isOpen, onClose, onInsert, anchorRef }: ScriptureBlockProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        let left = rect.left;
        const popoverWidth = 320;
        if (left + popoverWidth > window.innerWidth - 10) {
          left = window.innerWidth - popoverWidth - 10;
        }
        if (left < 10) left = 10;

        setPos({
          top: isMobile ? rect.top - 8 : rect.bottom + 8,
          left,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, anchorRef, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const encoded = encodeURIComponent(query.trim());
      const response = await fetch(`https://bible-api.com/${encoded}?translation=kjv`);
      
      if (response.status === 404) {
        setError('Verse not found. Check the reference.');
        return;
      }

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      
      onInsert({
        reference: data.reference,
        text: data.text.trim(),
        translation: 'KJV'
      });
      
      setQuery('');
      onClose();
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      ref={popoverRef}
      className="scripture-popover"
      style={{ top: pos.top, left: pos.left }}
    >
      <form onSubmit={handleSubmit} className="scripture-popover__form">
        <div className="scripture-popover__input-wrapper">
          <i className="fa-solid fa-book-bible scripture-popover__icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="John 3:16..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="scripture-popover__input"
            disabled={loading}
          />
          {loading && <i className="fa-solid fa-circle-notch fa-spin scripture-popover__loader" />}
        </div>
        
        {error && <div className="scripture-popover__error">{error}</div>}
        
        <div className="scripture-popover__hint">
          Press Enter to insert
        </div>
      </form>
    </div>,
    document.body
  );
}
