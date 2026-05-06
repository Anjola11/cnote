import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import type { EntryCard as EntryCardType } from '../../types';
import './EntryCard.css';

interface EntryCardProps {
  entry: EntryCardType;
  onDelete: (id: string) => void;
}

export default function EntryCard({ entry, onDelete }: EntryCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.entry-card__actions')) return;
    navigate(`/editor/${entry.id}`);
  };

  const dateLabel = formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true });

  return (
    <Card className="entry-card" onClick={handleClick}>
      <div className="entry-card__top">
        <Badge category={entry.category} />
        <span className="entry-card__date">{dateLabel}</span>
      </div>
      <h3 className="entry-card__title">{entry.title}</h3>
      <p className="entry-card__excerpt">{entry.excerpt}</p>
      <div className="entry-card__actions">
        <button
          className="entry-card__action"
          onClick={() => navigate(`/editor/${entry.id}`)}
          aria-label="Edit entry"
        >
          <i className="fa-solid fa-pen-to-square" />
        </button>
        <button
          className="entry-card__action entry-card__action--danger"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            onDelete(entry.id);
          }}
          aria-label="Delete entry"
        >
          <i className="fa-solid fa-trash" />
        </button>
      </div>
    </Card>
  );
}
