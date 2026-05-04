import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { Category } from '../../types';
import './Toolbar.css';

interface ToolbarProps {
  editor: Editor | null;
  category: Category;
  onScriptureClick?: () => void;
}

const PRESET_COLORS = ['#111110', '#DC2626', '#F97316', '#EAB308', '#16A34A', '#2563EB', '#7C3AED', '#EC4899'];

/* ── helper sub-components (defined OUTSIDE the parent to keep stable identity) ── */

function ToolBtn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) {
  return (
    <button
      className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
      type="button"
    >
      {children}
    </button>
  );
}

/* ── main component ── */

export default function Toolbar({ editor, category, onScriptureClick }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
            <button className="toolbar__link-apply" onClick={applyLink} type="button">
              <i className="fa-solid fa-check" />
            </button>
          </div>
        )}
      </div>

      {/* Color picker */}
      <div className="toolbar__color-wrapper">
        <ToolBtn active={false} onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
          <i className="fa-solid fa-palette" />
        </ToolBtn>
        {showColorPicker && (
          <div className="toolbar__color-popover">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                className="toolbar__color-swatch"
                style={{ background: c }}
                onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                aria-label={`Color ${c}`}
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
            <div className="toolbar__lang-popover">
              {['javascript', 'typescript', 'python', 'html', 'css', 'sql'].map(lang => (
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
