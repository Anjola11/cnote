import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import clsx from 'clsx';
import type { SaveStatus } from '../../types';
import './SaveStatus.css';

interface SaveStatusProps {
  status: SaveStatus;
}

const STATUS_CONFIG = {
  idle: { icon: '', label: '', className: '' },
  unsaved: { icon: '', label: 'Unsaved', className: 'save-status--unsaved' },
  'saved-locally': { icon: '', label: 'Saved locally', className: 'save-status--saved-locally' },
  saving: { icon: 'fa-solid fa-spinner fa-spin', label: 'Saving…', className: 'save-status--saving' },
  saved: { icon: 'fa-solid fa-check-circle', label: 'Synced', className: 'save-status--saved' },
  degraded: { icon: '', label: 'Saving…', className: 'save-status--degraded' },
  'circuit-open': { icon: 'fa-solid fa-triangle-exclamation', label: 'Save failed', className: 'save-status--error' },
  error: { icon: 'fa-solid fa-triangle-exclamation', label: 'Save failed', className: 'save-status--error' },
};

export default function SaveStatusIndicator({ status }: SaveStatusProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'idle' && ref.current) {
      gsap.fromTo(ref.current, { opacity: 0, x: 6 }, { opacity: 1, x: 0, duration: 0.2 });
    }
  }, [status]);

  if (status === 'idle') return null;

  const config = STATUS_CONFIG[status];

  return (
    <div ref={ref} className={clsx('save-status', config.className)}>
      {(status === 'unsaved' || status === 'degraded' || status === 'saved-locally') && <span className="save-status__dot pulse-dot" />}
      {config.icon && <i className={config.icon} />}
      <span>{config.label}</span>
    </div>
  );
}
