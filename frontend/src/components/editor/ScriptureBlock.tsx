import { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { scriptureApi } from '../../services/api';
import type { ScriptureVerse } from '../../types';
import './ScriptureBlock.css';

interface ScriptureBlockProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (verse: ScriptureVerse) => void;
}

export default function ScriptureBlock({ isOpen, onClose, onInsert }: ScriptureBlockProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScriptureVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await scriptureApi.search(q);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  const handleInsert = (verse: ScriptureVerse) => {
    onInsert(verse);
    onClose();
    setQuery('');
    setResults([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="scripture-modal__header">
        <i className="fa-solid fa-book-bible scripture-modal__header-icon" />
        <h2>Search Scripture</h2>
      </div>
      <div className="scripture-modal__search">
        <Input
          icon="fa-solid fa-magnifying-glass"
          placeholder="e.g. John 3:16, Psalm 23"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="scripture-modal__results">
        {loading && (
          <div className="scripture-modal__loading">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Searching...</span>
          </div>
        )}
        {!loading && results.length === 0 && query.trim() && (
          <div className="scripture-modal__empty">
            <span>No verses found for "{query}"</span>
          </div>
        )}
        {!loading && results.map((verse, i) => (
          <button key={i} className="scripture-modal__result" onClick={() => handleInsert(verse)}>
            <span className="scripture-modal__ref">{verse.reference} ({verse.translation})</span>
            <span className="scripture-modal__text">{verse.text}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
