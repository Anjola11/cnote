import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { gsap } from 'gsap';
import './Modal.css';

declare global {
  interface Window {
    __cnoteModalOpenCount?: number;
  }
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const openedAtRef = useRef<number>(0);
  const backdropPointerDownRef = useRef(false);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropTweenRef = useRef<gsap.core.Tween | null>(null);
  const boxTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current();
    if (e.key === 'Tab' && boxRef.current) {
      const focusable = boxRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !boxRef.current.contains(active) || !Array.from(focusable).includes(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    openedAtRef.current = Date.now();
    previousFocus.current = document.activeElement as HTMLElement;
    window.__cnoteModalOpenCount = (window.__cnoteModalOpenCount ?? 0) + 1;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    if (backdropRef.current) {
      backdropTweenRef.current?.kill();
      backdropTweenRef.current = gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, overwrite: 'auto' }
      );
    }
    if (boxRef.current) {
      boxTweenRef.current?.kill();
      boxTweenRef.current = gsap.fromTo(
        boxRef.current,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'expo.out', overwrite: 'auto' }
      );
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = setTimeout(() => { boxRef.current?.focus(); }, 50);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      backdropTweenRef.current?.kill();
      backdropTweenRef.current = null;
      boxTweenRef.current?.kill();
      boxTweenRef.current = null;
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }

      document.body.style.overflow = '';
      window.__cnoteModalOpenCount = Math.max(0, (window.__cnoteModalOpenCount ?? 1) - 1);

      // Do NOT restore focus here at all.
      // Let the caller (onClose handler) decide what to focus next.
      // Restoring focus from Modal causes Tiptap re-trigger loops.
      previousFocus.current = null;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      ref={backdropRef}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (Date.now() - openedAtRef.current < 200) return;
        backdropPointerDownRef.current = true;
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        if (!backdropPointerDownRef.current) return;
        backdropPointerDownRef.current = false;
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onPointerCancel={() => { backdropPointerDownRef.current = false; }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      <div
        className="modal-box"
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
          <button
            className="modal-close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close dialog"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
