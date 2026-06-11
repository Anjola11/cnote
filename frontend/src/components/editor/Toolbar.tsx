import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import './Toolbar.css';
import ImageUploadModal from './ImageUploadModal';
import ScriptureBlock from './ScriptureBlock';
import TablePicker from './TablePicker';

interface ToolbarProps {
  editor: Editor | null;
  noteId: string;
  disabled?: boolean;
  onScriptureClick?: () => void;
}

/** Extract all headings from the editor document for the anchor popover. */
function getEditorHeadings(editor: Editor): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'heading') {
      const text = node.textContent;
      const id = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (id) {
        headings.push({ level: node.attrs.level, text, id });
      }
    }
  });
  return headings;
}

const PRESET_COLORS = [
  { value: '#111110', className: 'toolbar__color-swatch--ink' },
  { value: '#DC2626', className: 'toolbar__color-swatch--red' },
  { value: '#F97316', className: 'toolbar__color-swatch--orange' },
  { value: '#EAB308', className: 'toolbar__color-swatch--yellow' },
  { value: '#16A34A', className: 'toolbar__color-swatch--green' },
  { value: '#2563EB', className: 'toolbar__color-swatch--blue' },
  { value: '#7C3AED', className: 'toolbar__color-swatch--violet' },
  { value: '#EC4899', className: 'toolbar__color-swatch--pink' },
];

/* ── helper sub-components (defined OUTSIDE the parent to keep stable identity) ── */

const ToolBtn = forwardRef<HTMLButtonElement, { active?: boolean; onClick: () => void; children: React.ReactNode; title: string; }>(
  ({ active, onClick, children, title }, ref) => {
    return (
      <button
        ref={ref}
        className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLButtonElement).blur();
          onClick();
        }}
        title={title}
        aria-label={title}
        type="button"
      >
        {children}
      </button>
    );
  }
);

function ToolbarPopover({ children, anchorRef, onClose }: { children: React.ReactNode, anchorRef: React.RefObject<HTMLElement | null>, onClose: () => void }) {
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        // Ensure popover doesn't go off screen horizontally
        const popoverWidth = 200; // estimated
        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 10) {
          left = window.innerWidth - popoverWidth - 10;
        }
        if (left < 10) left = 10;

        if (isMobile) {
          setPos({
            top: rect.top - 8,
            left,
            placement: 'top'
          });
        } else {
          setPos({
            top: rect.bottom + 8,
            left,
            placement: 'bottom'
          });
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose]);

  useEffect(() => {
    if (!popoverRef.current) return;
    popoverRef.current.style.top = `${pos.top}px`;
    popoverRef.current.style.left = `${pos.left}px`;
  }, [pos.top, pos.left]);

  return createPortal(
    <div 
      ref={popoverRef}
      className={`toolbar__popover-portal toolbar__popover-portal--${pos.placement}`}
    >
      {children}
    </div>,
    document.body
  );
}

/* ── main component ── */

export default function Toolbar({ editor, noteId, disabled = false }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAnchorPicker, setShowAnchorPicker] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const scriptureBtnRef = useRef<HTMLButtonElement>(null);
  const anchorBtnRef = useRef<HTMLButtonElement>(null);
  const tableBtnRef = useRef<HTMLButtonElement>(null);

  const [showScripturePopover, setShowScripturePopover] = useState(false);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let url = linkUrl.trim();
      // Don't prepend https:// for anchor (#) links
      if (!url.startsWith('#') && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      const isAnchor = url.startsWith('#');
      editor.chain().focus().extendMarkRange('link').setLink({
        href: url,
        target: isAnchor ? null : '_blank',
      }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  /** Insert an anchor link to a heading on the current selection. */
  const applyAnchorLink = useCallback((headingId: string) => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').setLink({
      href: `#${headingId}`,
      target: null,
    }).run();
    setShowAnchorPicker(false);
  }, [editor]);

  // Visual Viewport logic for mobile
  useEffect(() => {
    if (window.visualViewport && window.innerWidth <= 768) {
      const updateToolbarPosition = () => {
        const toolbar = document.querySelector('.toolbar') as HTMLElement;
        if (!toolbar) return;
        const viewport = window.visualViewport;
        if (!viewport) return;
        
        // Accurate keyboard offset calculation:
        // window.innerHeight is layout viewport height.
        // viewport.height + viewport.offsetTop is the bottom edge of the visual viewport.
        const offsetBottom = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop));
        
        // Apply the offset. We add 12px for the margin we want from the keyboard/bottom edge.
        toolbar.style.bottom = `${offsetBottom + 12}px`;
        // Add a smooth transition for the bottom property
        toolbar.style.transition = 'bottom 0.1s ease-out';
      };

      updateToolbarPosition();
      
      // Listen to both resize and scroll on visualViewport
      window.visualViewport.addEventListener('resize', updateToolbarPosition);
      window.visualViewport.addEventListener('scroll', updateToolbarPosition);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', updateToolbarPosition);
        window.visualViewport?.removeEventListener('scroll', updateToolbarPosition);
      };
    }
  }, []);

  // Don't render anything when the editor isn't ready
  if (!editor) return null;

  return (
    <div className={`toolbar ${disabled ? 'toolbar--disabled' : ''}`}>
      {/* Headings */}
      <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <span className="toolbar__text-btn">H1</span>
      </ToolBtn>
      <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <span className="toolbar__text-btn">H2</span>
      </ToolBtn>
      <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <span className="toolbar__text-btn">H3</span>
      </ToolBtn>

      <span className="toolbar__divider" />

      {/* Formatting */}
      <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <i className="fa-solid fa-bold" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <i className="fa-solid fa-italic" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <i className="fa-solid fa-underline" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <i className="fa-solid fa-strikethrough" />
      </ToolBtn>

      <span className="toolbar__divider" />

      {/* Link */}
      <div className="toolbar__link-wrapper">
        <ToolBtn
          ref={linkBtnRef}
          active={editor.isActive('link')}
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              setShowLinkInput(!showLinkInput);
            }
          }}
          title="Insert Link"
        >
          <i className="fa-solid fa-link" />
        </ToolBtn>
        {showLinkInput && (
          <ToolbarPopover anchorRef={linkBtnRef} onClose={() => setShowLinkInput(false)}>
            <div className="toolbar__link-popover">
              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkInput(false); }}
                className="toolbar__link-input"
                autoFocus
              />
              <button className="toolbar__link-apply" onClick={applyLink} type="button" title="Apply link" aria-label="Apply link">
                <i className="fa-solid fa-check" />
              </button>
            </div>
          </ToolbarPopover>
        )}
      </div>

      {/* Color picker */}
      <div className="toolbar__color-wrapper">
        <ToolBtn ref={colorBtnRef} active={false} onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
          <i className="fa-solid fa-palette" />
        </ToolBtn>
        {showColorPicker && (
          <ToolbarPopover anchorRef={colorBtnRef} onClose={() => setShowColorPicker(false)}>
            <div className="toolbar__color-popover">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`toolbar__color-swatch ${c.className}`}
                  onClick={() => { editor.chain().focus().setColor(c.value).run(); setShowColorPicker(false); }}
                  aria-label={`Color ${c.value}`}
                  type="button"
                />
              ))}
              <div className="toolbar__color-native-wrapper" title="Custom color">
                <input
                  type="color"
                  className="toolbar__color-native"
                  onChange={e => { editor.chain().focus().setColor(e.target.value).run(); setShowColorPicker(false); }}
                  title="Custom color"
                />
              </div>
            </div>
          </ToolbarPopover>
        )}
      </div>

      {/* Anchor / Jump-to link */}
      <div className="toolbar__anchor-wrapper">
        <ToolBtn
          ref={anchorBtnRef}
          active={showAnchorPicker}
          onClick={() => setShowAnchorPicker(!showAnchorPicker)}
          title="Jump to Section"
        >
          <i className="fa-solid fa-hashtag" />
        </ToolBtn>
        {showAnchorPicker && (
          <ToolbarPopover anchorRef={anchorBtnRef} onClose={() => setShowAnchorPicker(false)}>
            <div className="toolbar__anchor-popover">
              {(() => {
                const headings = editor ? getEditorHeadings(editor) : [];
                if (headings.length === 0) {
                  return <div className="toolbar__anchor-empty">No headings found.<br />Add H1, H2, or H3 headings first.</div>;
                }
                return headings.map((h, i) => (
                  <button
                    key={`${h.id}-${i}`}
                    className={`toolbar__anchor-option toolbar__anchor-option--h${h.level}`}
                    onClick={() => applyAnchorLink(h.id)}
                    type="button"
                    title={`Link to: ${h.text}`}
                  >
                    <span className="toolbar__anchor-level">H{h.level}</span>
                    <span className="toolbar__anchor-text">{h.text}</span>
                  </button>
                ));
              })()}
            </div>
          </ToolbarPopover>
        )}
      </div>

      <span className="toolbar__divider" />

      {/* Lists & blockquote */}
      <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <i className="fa-solid fa-list-ul" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
        <i className="fa-solid fa-list-ol" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
        <i className="fa-solid fa-quote-left" />
      </ToolBtn>

      {/* Table */}
      <div className="toolbar__table-wrapper">
        <ToolBtn
          ref={tableBtnRef}
          active={editor.isActive('table') || showTablePicker}
          onClick={() => setShowTablePicker(!showTablePicker)}
          title="Insert Table"
        >
          <i className="fa-solid fa-table" />
        </ToolBtn>
        {showTablePicker && (
          <ToolbarPopover anchorRef={tableBtnRef} onClose={() => setShowTablePicker(false)}>
            <TablePicker editor={editor} onClose={() => setShowTablePicker(false)} />
          </ToolbarPopover>
        )}
      </div>

      <span className="toolbar__divider" />

      {/* Image */}
      <ToolBtn active={false} onClick={() => setShowImageModal(true)} title="Insert Image">
        <i className="fa-solid fa-image" />
      </ToolBtn>

      <ImageUploadModal 
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={(attrs) => editor.chain().focus().setImage(attrs as any).run()}
        noteId={noteId}
      />

      <div className="toolbar__lang-wrapper">
        <ToolBtn
          ref={langBtnRef}
          active={editor.isActive('codeBlock')}
          onClick={() => {
            if (editor.isActive('codeBlock')) {
              editor.chain().focus().toggleCodeBlock().run();
            } else {
              setShowLangPicker(!showLangPicker);
            }
          }}
          title="Code Block"
        >
          <i className="fa-solid fa-terminal" />
        </ToolBtn>
        {showLangPicker && (
          <ToolbarPopover anchorRef={langBtnRef} onClose={() => setShowLangPicker(false)}>
            <div className="toolbar__lang-popover">
              {['javascript', 'typescript', 'rust', 'go', 'python', 'cpp', 'csharp', 'verilog', 'vhdl', 'x86asm'].map(lang => (
                <button
                  key={lang}
                  className="toolbar__lang-option"
                  onClick={() => {
                    editor.chain().focus().toggleCodeBlock({ language: lang }).run();
                    setShowLangPicker(false);
                  }}
                  type="button"
                >
                  {lang}
                </button>
              ))}
              <button
                className="toolbar__lang-option"
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  setShowLangPicker(false);
                }}
                type="button"
              >
                auto
              </button>
            </div>
          </ToolbarPopover>
        )}
      </div>

      <div className="toolbar__scripture-wrapper">
        <ToolBtn
          ref={scriptureBtnRef}
          active={showScripturePopover}
          onClick={() => setShowScripturePopover(!showScripturePopover)}
          title="Insert Scripture"
        >
          <i className="fa-solid fa-book-bible" />
        </ToolBtn>
        
        <ScriptureBlock
          isOpen={showScripturePopover}
          onClose={() => setShowScripturePopover(false)}
          onInsert={(verse) => {
            if (!editor) return;
            editor.chain().focus().insertContent({
              type: 'scripture',
              attrs: {
                reference: verse.reference,
                translation: verse.translation,
                text: verse.text,
              },
            }).run();
            setShowScripturePopover(false);
          }}
          anchorRef={scriptureBtnRef}
        />
      </div>
    </div>
  );
}
