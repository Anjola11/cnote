import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { formsApi } from '../../services/formsApi';
import { generateResponsesDocx, formatCellValue, type DocxExportOptions } from '../../utils/docxExport';
import type { Form, FormResponseItem } from '../../types/forms';
import './DocxExportModal.css';

interface DocxExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form;
  responses: FormResponseItem[];
}

export default function DocxExportModal({
  isOpen,
  onClose,
  form,
  responses,
}: DocxExportModalProps) {
  const [allResponses, setAllResponses] = useState<FormResponseItem[]>(responses);

  useEffect(() => {
    setAllResponses(responses);
    let isMounted = true;
    async function fetchAllRemaining() {
      if (!form?.id || responses.length < 50) return;
      try {
        let loaded = [...responses];
        let offset = responses.length;
        while (true) {
          const batch = await formsApi.listResponses(form.id, { limit: 200, offset });
          if (!batch || batch.length === 0) break;
          loaded = [...loaded, ...batch];
          offset += batch.length;
          if (batch.length < 200) break;
        }
        if (isMounted) {
          setAllResponses(loaded);
        }
      } catch (err) {
        console.warn('Could not fetch remaining responses for export', err);
      }
    }
    fetchAllRemaining();
    return () => { isMounted = false; };
  }, [form?.id, responses]);

  const sortedFields = useMemo(() => {
    return form ? [...form.fields].sort((a, b) => a.order - b.order) : [];
  }, [form]);

  // Initial orientation: forms with 5 or more fields look much better in Landscape!
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    return sortedFields.length >= 4 ? 'landscape' : 'portrait';
  });

  const [margins, setMargins] = useState<'normal' | 'compact'>('normal');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeMeta, setIncludeMeta] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeResponseId, setIncludeResponseId] = useState(false);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(() => {
    return new Set(sortedFields.map(f => f.id));
  });

  const defaultFileName = useMemo(() => {
    const cleanTitle = (form?.title || 'form')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 40);
    return `${cleanTitle}-responses`;
  }, [form?.title]);

  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    setFileName(defaultFileName);
  }, [defaultFileName]);

  const [zoom, setZoom] = useState(1.0);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    } else {
      touchStartDistRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newZoom = Math.min(1.8, Math.max(0.4, touchStartZoomRef.current * ratio));
      setZoom(parseFloat(newZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !form) return null;

  const allFieldIds = new Set(sortedFields.map(f => f.id));
  const isAllSelected = selectedFieldIds.size === allFieldIds.size;

  const handleSelectAll = () => {
    setSelectedFieldIds(new Set(allFieldIds));
  };

  const handleClearAll = () => {
    setSelectedFieldIds(new Set());
  };

  const toggleField = (id: string) => {
    const next = new Set(selectedFieldIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedFieldIds(next);
  };

  // Active fields for preview
  const activeFields = sortedFields.filter(f => selectedFieldIds.has(f.id));

  // Limit sample responses in the on-screen preview to 20 so rendering is silky smooth
  const previewResponses = allResponses.slice(0, 20);

  const handleDownloadDocx = async () => {
    if (selectedFieldIds.size === 0 && !includeTimestamp && !includeResponseId && !includeIndex) {
      toast.error('Please select at least one column to export.');
      return;
    }

    try {
      setIsExporting(true);
      const options: DocxExportOptions = {
        orientation,
        margins,
        includeTitle,
        includeMeta,
        includeIndex,
        includeTimestamp,
        includeResponseId,
        selectedFieldIds: Array.from(selectedFieldIds),
      };

      const blob = await generateResponsesDocx(form, allResponses, options);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = (fileName.trim() || 'responses')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Word document (.docx) generated and downloaded!');
      onClose();
    } catch (err: any) {
      console.error('Failed to export DOCX:', err);
      toast.error('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="docx-modal-overlay" onClick={onClose}>
      <div className="docx-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="docx-modal__header">
          <div className="docx-modal__header-title">
            <div className="docx-modal__word-icon">
              <i className="fa-solid fa-file-word" />
            </div>
            <div className="docx-modal__title-text">
              <h2>Export Responses to Word (.docx)</h2>
              <p>Live A4 Paper Preview • Genuine Microsoft Word Table Output</p>
            </div>
          </div>
          <button className="docx-modal__close-btn" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="docx-modal__body">
          {/* Mobile Tab Switcher */}
          <div className="docx-modal__mobile-tabs">
            <button
              type="button"
              className={`docx-mobile-tab-btn ${mobileTab === 'settings' ? 'docx-mobile-tab-btn--active' : ''}`}
              onClick={() => setMobileTab('settings')}
            >
              <i className="fa-solid fa-sliders" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className={`docx-mobile-tab-btn ${mobileTab === 'preview' ? 'docx-mobile-tab-btn--active' : ''}`}
              onClick={() => setMobileTab('preview')}
            >
              <i className="fa-solid fa-eye" />
              <span>A4 Preview</span>
            </button>
          </div>

          {/* Left: Controls Sidebar */}
          <aside className={`docx-modal__sidebar ${mobileTab === 'settings' ? 'docx-modal__sidebar--active' : ''}`}>
            {/* File Name */}
            <div className="docx-control-group">
              <span className="docx-control-label">Export File Name</span>
              <div className="docx-filename-input-wrap">
                <input
                  type="text"
                  className="docx-filename-input"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="responses-export"
                />
                <span className="docx-filename-ext">.docx</span>
              </div>
            </div>

            {/* Page Orientation */}
            <div className="docx-control-group">
              <span className="docx-control-label">Page Orientation</span>
              <div className="docx-orientation-toggle">
                <button
                  type="button"
                  className={`docx-orientation-btn ${orientation === 'portrait' ? 'docx-orientation-btn--active' : ''}`}
                  onClick={() => setOrientation('portrait')}
                >
                  <span className="docx-paper-icon docx-paper-icon--portrait" />
                  <span>Portrait (A4)</span>
                </button>
                <button
                  type="button"
                  className={`docx-orientation-btn ${orientation === 'landscape' ? 'docx-orientation-btn--active' : ''}`}
                  onClick={() => setOrientation('landscape')}
                >
                  <span className="docx-paper-icon docx-paper-icon--landscape" />
                  <span>Landscape (A4)</span>
                </button>
              </div>
              <span className="docx-help-text">
                {orientation === 'landscape'
                  ? '✓ Landscape gives wide tables room to breathe (297 × 210 mm).'
                  : 'Portrait is ideal for forms with 2–4 columns (210 × 297 mm).'}
              </span>
            </div>

            {/* Paper Margins */}
            <div className="docx-control-group">
              <span className="docx-control-label">Document Margins</span>
              <div className="docx-pill-group">
                <button
                  type="button"
                  className={`docx-pill-btn ${margins === 'normal' ? 'docx-pill-btn--active' : ''}`}
                  onClick={() => setMargins('normal')}
                >
                  Normal (1.0 in)
                </button>
                <button
                  type="button"
                  className={`docx-pill-btn ${margins === 'compact' ? 'docx-pill-btn--active' : ''}`}
                  onClick={() => setMargins('compact')}
                >
                  Compact (0.5 in)
                </button>
              </div>
            </div>

            {/* Document Header Elements */}
            <div className="docx-control-group">
              <span className="docx-control-label">Header Elements</span>
              <div className="docx-options-list">
                <label className="docx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeTitle}
                    onChange={e => setIncludeTitle(e.target.checked)}
                  />
                  <span>Include Form Title & Description</span>
                </label>
                <label className="docx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeMeta}
                    onChange={e => setIncludeMeta(e.target.checked)}
                  />
                  <span>Include Export Timestamp & Stats</span>
                </label>
              </div>
            </div>

            {/* System Columns */}
            <div className="docx-control-group">
              <span className="docx-control-label">System Columns</span>
              <div className="docx-options-list">
                <label className="docx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeIndex}
                    onChange={e => setIncludeIndex(e.target.checked)}
                  />
                  <span># Row Number (1, 2, 3...)</span>
                </label>
                <label className="docx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeTimestamp}
                    onChange={e => setIncludeTimestamp(e.target.checked)}
                  />
                  <span>Submission Date & Time</span>
                </label>
                <label className="docx-checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeResponseId}
                    onChange={e => setIncludeResponseId(e.target.checked)}
                  />
                  <span>Response ID (Short UUID)</span>
                </label>
              </div>
            </div>

            {/* Form Fields Selector */}
            <div className="docx-control-group docx-columns-container">
              <div className="docx-control-label">
                <span>Form Fields ({selectedFieldIds.size}/{sortedFields.length})</span>
                <div className="docx-columns-actions">
                  <button type="button" className="docx-link-btn" onClick={isAllSelected ? handleClearAll : handleSelectAll}>
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
              <div className="docx-columns-list">
                {sortedFields.map(field => (
                  <label key={field.id} className="docx-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedFieldIds.has(field.id)}
                      onChange={() => toggleField(field.id)}
                    />
                    <span>{field.label || 'Untitled Field'}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right: A4 Sheet Preview Stage */}
          <main className={`docx-stage ${mobileTab === 'preview' ? 'docx-stage--active' : ''}`}>
            {/* Viewport Top bar */}
            <div className="docx-stage__toolbar">
              <div className="docx-stage__badge">
                <i className="fa-solid fa-file-lines" />
                <span>
                  A4 {orientation === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
                </span>
                <span>•</span>
                <span>{allResponses.length} Total Responses</span>
              </div>

              <div className="docx-stage__zoom-controls">
                <button
                  type="button"
                  className="docx-zoom-btn"
                  onClick={() => setZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(2))))}
                  title="Zoom out"
                >
                  <i className="fa-solid fa-minus" />
                </button>
                <button
                  type="button"
                  className="docx-zoom-btn docx-zoom-btn--reset"
                  onClick={() => setZoom(1.0)}
                  title="Reset zoom to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className="docx-zoom-btn"
                  onClick={() => setZoom(z => Math.min(1.8, parseFloat((z + 0.1).toFixed(2))))}
                  title="Zoom in"
                >
                  <i className="fa-solid fa-plus" />
                </button>
              </div>
            </div>

            {/* Scrollable Viewport with A4 Paper */}
            <div
              className="docx-viewport"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="docx-canvas"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  className={`docx-a4-sheet docx-a4-sheet--${orientation} ${margins === 'compact' ? 'docx-a4-sheet--compact' : ''}`}
                >
                {/* Document Header in Sheet */}
                {includeTitle && (
                  <header className="docx-sheet__header">
                    <h1 className="docx-sheet__title">{form.title || 'Form Responses'}</h1>
                    {form.description && <p className="docx-sheet__desc">{form.description}</p>}
                    {includeMeta && (
                      <div className="docx-sheet__meta">
                        <span>Generated on: {format(new Date(), 'PP p')}</span>
                        <span>•</span>
                        <span>Total Records: {allResponses.length}</span>
                        <span>•</span>
                        <span>Layout: {orientation.toUpperCase()}</span>
                      </div>
                    )}
                  </header>
                )}

                {/* Actual Table in Sheet */}
                <div className="docx-sheet__table-wrap">
                  <table className="docx-sheet__table">
                    <thead>
                      <tr>
                        {includeIndex && <th style={{ width: '40px', textAlign: 'center' }}>#</th>}
                        {includeResponseId && <th style={{ width: '70px' }}>ID</th>}
                        {includeTimestamp && <th style={{ width: '110px' }}>Submitted At</th>}
                        {activeFields.map(field => (
                          <th key={field.id}>{field.label || 'Untitled Field'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewResponses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={(includeIndex ? 1 : 0) + (includeResponseId ? 1 : 0) + (includeTimestamp ? 1 : 0) + Math.max(1, activeFields.length)}
                            style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}
                          >
                            No responses collected yet.
                          </td>
                        </tr>
                      ) : (
                        previewResponses.map((res, idx) => (
                          <tr key={res.id}>
                            {includeIndex && (
                              <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '10px' }}>
                                {idx + 1}
                              </td>
                            )}
                            {includeResponseId && (
                              <td style={{ fontFamily: 'monospace', fontSize: '9.5px', color: '#64748b' }}>
                                {res.id.slice(0, 8)}
                              </td>
                            )}
                            {includeTimestamp && (
                              <td style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                {format(new Date(res.submitted_at), 'yyyy-MM-dd HH:mm')}
                              </td>
                            )}
                            {activeFields.map(field => {
                              const ans = res.answers.find(a => a.field_id === field.id);
                              return (
                                <td key={field.id}>
                                  {formatCellValue(ans?.value)}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sheet Footer simulation */}
                <footer className="docx-sheet__footer">
                  <span>cnote form responses export</span>
                  <span>Page 1 of {Math.max(1, Math.ceil(allResponses.length / 18))}</span>
                </footer>
              </div>
            </div>
          </div>
        </main>
        </div>

        {/* Modal Footer */}
        <div className="docx-modal__footer">
          <div className="docx-modal__footer-info">
            <span>
              Exporting <strong>{allResponses.length} responses</strong> with{' '}
              <strong>
                {(includeIndex ? 1 : 0) + (includeResponseId ? 1 : 0) + (includeTimestamp ? 1 : 0) + activeFields.length} columns
              </strong>{' '}
              in <strong>{orientation}</strong> orientation.
            </span>
          </div>
          <div className="docx-modal__footer-actions">
            <Button variant="ghost" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <button
              type="button"
              className="docx-download-btn"
              onClick={handleDownloadDocx}
              disabled={isExporting || (activeFields.length === 0 && !includeTimestamp && !includeResponseId && !includeIndex)}
            >
              {isExporting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Generating Word Document…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-word" />
                  <span>Download .docx Table</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
