import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import './TablePicker.css';

const GRID_ROWS = 6;
const GRID_COLS = 6;

/* ── Sub-components ── */

function GridPicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState({ r: 0, c: 0 });
  const [showCustom, setShowCustom] = useState(false);
  const [customRows, setCustomRows] = useState(4);
  const [customCols, setCustomCols] = useState(4);

  if (showCustom) {
    return (
      <div className="table-picker__custom">
        <StepperRow label="Columns" value={customCols} min={1} max={20} onChange={setCustomCols} />
        <StepperRow label="Rows" value={customRows} min={1} max={30} onChange={setCustomRows} />
        <div className="table-picker__preview-label">{customCols} × {customRows} table</div>
        <div className="table-picker__custom-actions">
          <button
            className="table-picker__back-btn"
            onClick={() => setShowCustom(false)}
            type="button"
          >
            ← Grid
          </button>
          <button
            className="table-picker__insert-btn"
            onClick={() => onSelect(customRows, customCols)}
            type="button"
          >
            Insert table
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="table-picker__grid-wrapper">
      <div className="table-picker__preview-label">
        {hovered.c > 0 ? `${hovered.c} × ${hovered.r}` : 'Hover to select size'}
      </div>

      <div
        className="table-picker__grid"
        onMouseLeave={() => setHovered({ r: 0, c: 0 })}
      >
        {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => {
          const r = Math.floor(i / GRID_COLS) + 1;
          const c = (i % GRID_COLS) + 1;
          const active = r <= hovered.r && c <= hovered.c;
          return (
            <div
              key={i}
              className={`table-picker__cell ${active ? 'table-picker__cell--active' : ''}`}
              onMouseEnter={() => setHovered({ r, c })}
              onClick={() => onSelect(hovered.r, hovered.c)}
            />
          );
        })}
      </div>

      <button
        className="table-picker__custom-link"
        onClick={() => setShowCustom(true)}
        type="button"
      >
        Custom size…
      </button>
    </div>
  );
}

function StepperRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="table-picker__stepper-row">
      <span className="table-picker__stepper-label">{label}</span>
      <div className="table-picker__stepper-controls">
        <button
          className="table-picker__stepper-btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          type="button"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="table-picker__stepper-value">{value}</span>
        <button
          className="table-picker__stepper-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          type="button"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function StepperPicker({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);

  return (
    <div className="table-picker__stepper-wrapper">
      <StepperRow label="Columns" value={cols} min={1} max={10} onChange={setCols} />
      <StepperRow label="Rows" value={rows} min={1} max={20} onChange={setRows} />
      <div className="table-picker__preview-label">{cols} × {rows} table</div>
      <button
        className="table-picker__insert-btn"
        onClick={() => onInsert(rows, cols)}
        type="button"
      >
        Insert table
      </button>
    </div>
  );
}

/* ── Main component ── */

interface TablePickerProps {
  editor: Editor;
  onClose: () => void;
}

export default function TablePicker({ editor, onClose }: TablePickerProps) {
  const [isGridMode, setIsGridMode] = useState(true);

  useEffect(() => {
    // Detect touch-primary devices on mount
    const isTouchDevice = window.matchMedia('(hover: none)').matches;
    setIsGridMode(!isTouchDevice);
  }, []);

  const insert = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      onClose();
    },
    [editor, onClose],
  );

  return (
    <div className="table-picker">
      <div className="table-picker__header">
        <span className="table-picker__title">Insert Table</span>
        <button
          className="table-picker__mode-toggle"
          onClick={() => setIsGridMode((m) => !m)}
          type="button"
          title={`Switch to ${isGridMode ? 'stepper' : 'grid'}`}
        >
          {isGridMode ? (
            <i className="fa-solid fa-sliders" />
          ) : (
            <i className="fa-solid fa-grid" />
          )}
        </button>
      </div>

      {isGridMode ? (
        <GridPicker onSelect={insert} />
      ) : (
        <StepperPicker onInsert={insert} />
      )}
    </div>
  );
}
