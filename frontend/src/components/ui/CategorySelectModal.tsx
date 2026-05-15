import Modal from './Modal';
import { CATEGORY_OPTIONS } from '../../types';
import type { Category } from '../../types';

interface CategorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
}

export default function CategorySelectModal({ isOpen, onClose, onSelect }: CategorySelectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What kind of note?"
    >
      <div className="new-note-modal-options">
        {CATEGORY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className="new-note-modal-option"
            onClick={() => {
              onSelect(opt.value);
            }}
          >
            <div className={`new-note-modal-option-icon new-note-modal-option-icon--${opt.value}`}>
              <i className={opt.icon} />
            </div>
            <div className="new-note-modal-option-text">
              <strong>{opt.title}</strong>
              <span>{opt.sub}</span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
