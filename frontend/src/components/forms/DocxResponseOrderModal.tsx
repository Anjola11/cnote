import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Form, FormResponseItem, FormField } from '../../types/forms';
import { formatCellValue } from '../../utils/docxExport';
import './DocxResponseOrderModal.css';

interface DocxResponseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderedResponses: FormResponseItem[];
  originalResponses: FormResponseItem[];
  form: Form;
  onUpdateOrder: (newOrder: FormResponseItem[]) => void;
  onResetOrder: () => void;
}

/**
 * Helper to get a human-readable summary of the first 2-3 fields with values
 */
function getResponsePreview(response: FormResponseItem, fields: FormField[]): string {
  const parts: string[] = [];
  for (const field of fields) {
    if (parts.length >= 2) break;
    const ans = response.answers.find(a => a.field_id === field.id);
    if (ans && ans.value !== null && ans.value !== undefined && ans.value !== '') {
      const formatted = formatCellValue(ans.value);
      if (formatted && formatted !== '—') {
        const shortVal = formatted.length > 30 ? formatted.slice(0, 30) + '…' : formatted;
        parts.push(`${field.label || 'Field'}: ${shortVal}`);
      }
    }
  }
  return parts.length > 0 ? parts.join(' • ') : 'No text answers';
}

export default function DocxResponseOrderModal({
  isOpen,
  onClose,
  orderedResponses,
  originalResponses,
  form,
  onUpdateOrder,
  onResetOrder,
}: DocxResponseOrderModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFrom, setQuickFrom] = useState('');
  const [quickTo, setQuickTo] = useState('');
  const [rowTargetInputs, setRowTargetInputs] = useState<Record<string, string>>({});
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Map of original 1-based positions for each response ID
  const originalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    originalResponses.forEach((res, i) => {
      map.set(res.id, i + 1);
    });
    return map;
  }, [originalResponses]);

  // Sorted form fields for preview summary
  const sortedFields = useMemo(() => {
    return form ? [...form.fields].sort((a, b) => a.order - b.order) : [];
  }, [form]);

  // Reset inputs when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setQuickFrom('');
      setQuickTo('');
      setRowTargetInputs({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCount = orderedResponses.length;

  // Move item in array from one index to another
  const executeMove = (fromIndex: number, toIndex: number, toastMsg?: string) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= totalCount || toIndex < 0 || toIndex >= totalCount) return;

    const copy = [...orderedResponses];
    const [removed] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, removed);
    onUpdateOrder(copy);

    if (toastMsg) {
      toast.success(toastMsg);
    }
  };

  // Quick move handler (from 1-based to 1-based)
  const handleQuickMove = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fromNum = parseInt(quickFrom.trim(), 10);
    const toNum = parseInt(quickTo.trim(), 10);

    if (isNaN(fromNum) || fromNum < 1 || fromNum > totalCount) {
      toast.error(`Please enter a valid "From" row number between 1 and ${totalCount}.`);
      return;
    }
    if (isNaN(toNum) || toNum < 1 || toNum > totalCount) {
      toast.error(`Please enter a valid "To" position between 1 and ${totalCount}.`);
      return;
    }
    if (fromNum === toNum) {
      toast('The row is already at that position.');
      return;
    }

    executeMove(fromNum - 1, toNum - 1, `Moved response #${fromNum} to position #${toNum}!`);
    setQuickFrom('');
    setQuickTo('');
  };

  // Move individual row by its target input
  const handleRowTargetSubmit = (currentIndex: number, responseId: string) => {
    const rawVal = rowTargetInputs[responseId]?.trim();
    if (!rawVal) return;
    const targetNum = parseInt(rawVal, 10);

    if (isNaN(targetNum) || targetNum < 1 || targetNum > totalCount) {
      toast.error(`Please enter a valid target position between 1 and ${totalCount}.`);
      return;
    }
    if (targetNum === currentIndex + 1) {
      toast('Row is already at position ' + targetNum);
      return;
    }

    executeMove(currentIndex, targetNum - 1, `Moved response #${currentIndex + 1} to #${targetNum}!`);
    setRowTargetInputs(prev => ({ ...prev, [responseId]: '' }));
  };

  // Presets
  const handleSortNewest = () => {
    const sorted = [...orderedResponses].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    onUpdateOrder(sorted);
    toast.success('Sorted by newest submission first.');
  };

  const handleSortOldest = () => {
    const sorted = [...orderedResponses].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    onUpdateOrder(sorted);
    toast.success('Sorted by oldest submission first.');
  };

  const handleReverse = () => {
    const reversed = [...orderedResponses].reverse();
    onUpdateOrder(reversed);
    toast.success('Reversed current order.');
  };

  // Filtered rows for search
  const filteredList = orderedResponses.map((res, index) => ({ res, index })).filter(({ res, index }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const posStr = String(index + 1);
    const origPosStr = String(originalIndexMap.get(res.id) || '');
    if (posStr === q || origPosStr === q || res.id.toLowerCase().includes(q)) return true;

    // Check answers
    return res.answers.some(a => String(a.value || '').toLowerCase().includes(q));
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      executeMove(draggedIndex, targetIndex, `Moved response #${draggedIndex + 1} to position #${targetIndex + 1}!`);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isCustomOrder = orderedResponses.some((res, idx) => {
    return originalIndexMap.get(res.id) !== idx + 1;
  });

  return (
    <div className="docx-order-overlay" onClick={onClose}>
      <div className="docx-order-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="docx-order-modal__header">
          <div className="docx-order-modal__title-group">
            <div className="docx-order-modal__icon">
              <i className="fa-solid fa-arrow-down-up-across-line" />
            </div>
            <div>
              <div className="docx-order-modal__title-row">
                <h2>Arrange Response Table Rows</h2>
                <span className="docx-order-badge docx-order-badge--count">
                  {totalCount} responses
                </span>
                {isCustomOrder ? (
                  <span className="docx-order-badge docx-order-badge--custom">
                    <i className="fa-solid fa-pen-ruler" /> Custom Order Active
                  </span>
                ) : (
                  <span className="docx-order-badge docx-order-badge--default">
                    Original Order
                  </span>
                )}
              </div>
              <p className="docx-order-modal__subtitle">
                Reorder how rows appear in your exported Word table. Drag items, jump positions, or use quick presets.
              </p>
            </div>
          </div>
          <button className="docx-order-modal__close-btn" onClick={onClose} aria-label="Close manager">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Toolbar: Quick Jump + Presets */}
        <div className="docx-order-toolbar">
          {/* Quick Reposition Form */}
          <form className="docx-order-quick-jump" onSubmit={handleQuickMove}>
            <span className="docx-order-quick-jump__label">
              <i className="fa-solid fa-bolt" /> Quick Move:
            </span>
            <div className="docx-order-quick-jump__inputs">
              <div className="docx-order-quick-input-group">
                <span className="docx-order-quick-hash">Row #</span>
                <input
                  type="number"
                  min={1}
                  max={totalCount}
                  placeholder="15"
                  value={quickFrom}
                  onChange={e => setQuickFrom(e.target.value)}
                  className="docx-order-num-input"
                  title="Source row number"
                />
              </div>
              <i className="fa-solid fa-arrow-right docx-order-arrow-icon" />
              <div className="docx-order-quick-input-group">
                <span className="docx-order-quick-hash">To Position #</span>
                <input
                  type="number"
                  min={1}
                  max={totalCount}
                  placeholder="5"
                  value={quickTo}
                  onChange={e => setQuickTo(e.target.value)}
                  className="docx-order-num-input"
                  title="Target position number"
                />
              </div>
              <button
                type="submit"
                className="docx-order-move-btn"
                disabled={!quickFrom || !quickTo}
              >
                <i className="fa-solid fa-arrow-right-arrow-left" />
                <span>Move Row</span>
              </button>
            </div>
          </form>

          {/* Presets & Actions */}
          <div className="docx-order-presets">
            <button
              type="button"
              className="docx-order-preset-btn"
              onClick={handleSortNewest}
              title="Sort with latest responses first"
            >
              <i className="fa-solid fa-arrow-down-wide-short" />
              <span>Newest First</span>
            </button>
            <button
              type="button"
              className="docx-order-preset-btn"
              onClick={handleSortOldest}
              title="Sort with oldest responses first"
            >
              <i className="fa-solid fa-arrow-up-wide-short" />
              <span>Oldest First</span>
            </button>
            <button
              type="button"
              className="docx-order-preset-btn"
              onClick={handleReverse}
              title="Reverse the current row order"
            >
              <i className="fa-solid fa-arrows-up-down" />
              <span>Reverse</span>
            </button>
            {isCustomOrder && (
              <button
                type="button"
                className="docx-order-preset-btn docx-order-preset-btn--reset"
                onClick={() => {
                  onResetOrder();
                  toast.success('Reset to original order.');
                }}
                title="Restore initial response order"
              >
                <i className="fa-solid fa-rotate-left" />
                <span>Reset Original</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="docx-order-filter-bar">
          <div className="docx-order-search-wrap">
            <i className="fa-solid fa-magnifying-glass docx-order-search-icon" />
            <input
              type="text"
              placeholder="Filter by row #, answer keyword, or response ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="docx-order-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="docx-order-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
          <span className="docx-order-count-hint">
            Showing {filteredList.length} of {totalCount} rows
          </span>
        </div>

        {/* Response rows list */}
        <div className="docx-order-list">
          {filteredList.length === 0 ? (
            <div className="docx-order-empty">
              <i className="fa-solid fa-filter-circle-xmark" />
              <p>No responses match "{searchQuery}"</p>
              <button
                type="button"
                className="docx-order-preset-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredList.map(({ res, index }) => {
              const currentPos = index + 1;
              const originalPos = originalIndexMap.get(res.id);
              const wasMoved = originalPos !== undefined && originalPos !== currentPos;
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;
              const targetVal = rowTargetInputs[res.id] ?? '';

              return (
                <div
                  key={res.id}
                  className={`docx-order-row ${isDragging ? 'docx-order-row--dragging' : ''} ${
                    isOver ? 'docx-order-row--over' : ''
                  } ${wasMoved ? 'docx-order-row--moved' : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragOver={e => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={e => handleDrop(e, index)}
                >
                  {/* Drag Handle */}
                  <div className="docx-order-row__grip" title="Drag to reorder row">
                    <i className="fa-solid fa-grip-vertical" />
                  </div>

                  {/* Position Badge & Status */}
                  <div className="docx-order-row__pos-col">
                    <span className="docx-order-row__pos-badge">
                      #{currentPos}
                    </span>
                    {wasMoved && (
                      <span className="docx-order-row__orig-badge" title={`Originally response #${originalPos}`}>
                        was #{originalPos}
                      </span>
                    )}
                  </div>

                  {/* Summary / Answers info */}
                  <div className="docx-order-row__info">
                    <div className="docx-order-row__preview-text">
                      {getResponsePreview(res, sortedFields)}
                    </div>
                    <div className="docx-order-row__meta">
                      <span>
                        <i className="fa-regular fa-clock" />{' '}
                        {format(new Date(res.submitted_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                      <span>•</span>
                      <span className="docx-order-row__id">ID: {res.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* Quick Jump Input on Row */}
                  <div className="docx-order-row__jump-box">
                    <span className="docx-order-row__jump-label">Move to #</span>
                    <input
                      type="number"
                      min={1}
                      max={totalCount}
                      placeholder={String(currentPos)}
                      value={targetVal}
                      onChange={e =>
                        setRowTargetInputs({ ...rowTargetInputs, [res.id]: e.target.value })
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleRowTargetSubmit(index, res.id);
                        }
                      }}
                      className="docx-order-row__jump-input"
                      title="Enter target row position and press Enter"
                    />
                    <button
                      type="button"
                      className="docx-order-row__jump-btn"
                      onClick={() => handleRowTargetSubmit(index, res.id)}
                      disabled={!targetVal || parseInt(targetVal, 10) === currentPos}
                      title="Apply new position"
                    >
                      Go
                    </button>
                  </div>

                  {/* Quick Nudge Buttons */}
                  <div className="docx-order-row__actions">
                    <button
                      type="button"
                      className="docx-order-action-btn"
                      onClick={() => executeMove(index, 0, `Moved response #${currentPos} to top (#1)`)}
                      disabled={index === 0}
                      title="Move to top (#1)"
                    >
                      <i className="fa-solid fa-angles-up" />
                    </button>
                    <button
                      type="button"
                      className="docx-order-action-btn"
                      onClick={() => executeMove(index, index - 1)}
                      disabled={index === 0}
                      title="Move up 1 position"
                    >
                      <i className="fa-solid fa-chevron-up" />
                    </button>
                    <button
                      type="button"
                      className="docx-order-action-btn"
                      onClick={() => executeMove(index, index + 1)}
                      disabled={index === totalCount - 1}
                      title="Move down 1 position"
                    >
                      <i className="fa-solid fa-chevron-down" />
                    </button>
                    <button
                      type="button"
                      className="docx-order-action-btn"
                      onClick={() => executeMove(index, totalCount - 1, `Moved response #${currentPos} to bottom (#${totalCount})`)}
                      disabled={index === totalCount - 1}
                      title={`Move to bottom (#${totalCount})`}
                    >
                      <i className="fa-solid fa-angles-down" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="docx-order-modal__footer">
          <div className="docx-order-modal__footer-status">
            {isCustomOrder ? (
              <span className="docx-order-status--active">
                <i className="fa-solid fa-check-circle" /> Custom order ready for export
              </span>
            ) : (
              <span>Responses will export in default chronological order</span>
            )}
          </div>
          <div className="docx-order-modal__footer-actions">
            {isCustomOrder && (
              <button
                type="button"
                className="docx-order-reset-link"
                onClick={() => {
                  onResetOrder();
                  toast.success('Reset to original order.');
                }}
              >
                Reset to Default
              </button>
            )}
            <button
              type="button"
              className="docx-order-done-btn"
              onClick={onClose}
            >
              <i className="fa-solid fa-check" />
              <span>Apply & Return to Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
