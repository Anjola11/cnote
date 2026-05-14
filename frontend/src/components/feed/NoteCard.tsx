import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import type { NoteListItem } from '../../types';
import './NoteCard.css';

interface NoteCardProps {
  note: NoteListItem;
  onDelete: (id: string) => void;
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.note-card__actions')) return;
    navigate(`/editor/${note.id}`);
  };

  const dateLabel = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  return (
    <Card className="note-card" onClick={handleClick}>
      <div className="note-card__header">
        <Badge category={note.category} />
        <span className="note-card__date">{dateLabel}</span>
      </div>
      <h3 className="note-card__title">{note.title}</h3>
      <p className="note-card__excerpt">{note.content_text}</p>
      <div className="note-card__actions">
        <button
          className="note-card__action"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/editor/${note.id}`);
          }}
          aria-label="Edit entry"
        >
          <i className="fa-solid fa-pen-to-square" />
        </button>
        <button
          className="note-card__action note-card__action--danger"
          onClick={(e) => {
            e.preventDefault();
            onDelete(note.id);
          }}
          aria-label="Delete note"
        >
          <i className="fa-solid fa-trash" />
        </button>
      </div>
    </Card>
  );
}
