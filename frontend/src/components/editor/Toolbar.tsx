import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import type { Category } from '../../types';
import './Toolbar.css';

interface ToolbarProps {
  editor: Editor | null;
  category: Category;
  onScriptureClick?: () => void;
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

export default function Toolbar({ editor, category, onScriptureClick }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let url = linkUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  // Don't render anything when the editor isn't ready
  if (!editor) return null;

  return (
    <div className="toolbar">
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
              <input
                type="color"
                className="toolbar__color-native"
                onChange={e => { editor.chain().focus().setColor(e.target.value).run(); setShowColorPicker(false); }}
                title="Custom color"
              />
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

      <span className="toolbar__divider" />

      {/* Image */}
      <ToolBtn active={false} onClick={() => {
        const url = window.prompt('Image URL');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }} title="Insert Image">
        <i className="fa-solid fa-image" />
      </ToolBtn>

      {/* Category-conditional tools */}
      {category === 'programming' && (
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
      )}
      {category === 'spiritual' && onScriptureClick && (
        <ToolBtn active={false} onClick={onScriptureClick} title="Insert Scripture">
          <i className="fa-solid fa-book-bible" />
        </ToolBtn>
      )}
    </div>
  );
}
