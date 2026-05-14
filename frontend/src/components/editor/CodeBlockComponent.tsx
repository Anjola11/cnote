import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import ConfirmModal from '../ui/ConfirmModal';
import './CodeBlockComponent.css';

const LANGUAGES = [
  { label: 'Auto', value: 'null' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'Python', value: 'python' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'SQL', value: 'sql' },
  { label: 'Verilog', value: 'verilog' },
  { label: 'VHDL', value: 'vhdl' },
  { label: 'Assembly', value: 'x86asm' },
  { label: 'Bash', value: 'bash' },
  { label: 'Markdown', value: 'markdown' },
];

export default function CodeBlockComponent({
  node: { attrs: { language: defaultLanguage } },
  updateAttributes,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateAttributes({ language: event.target.value === 'null' ? null : event.target.value });
  };

  const handleCopy = () => {
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof pos !== 'number') return;
    const text = editor.state.doc.nodeAt(pos)?.textContent || '';
    if (text) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <NodeViewWrapper className="code-block" data-gramm="false">
      <div className="code-block__header" contentEditable={false}>
        {defaultLanguage && defaultLanguage !== 'null' ? (
          <span className="code-block__language-label">
            {LANGUAGES.find(l => l.value === defaultLanguage)?.label || defaultLanguage}
          </span>
        ) : editor.isEditable ? (
          <select
            className="code-block__language"
            value={defaultLanguage || 'null'}
            onChange={handleLanguageChange}
            aria-label="Select language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        ) : (
          <span className="code-block__language-label">Auto</span>
        )}
        <div className="code-block__actions">
          <button className="code-block__copy" onClick={handleCopy} title="Copy code" type="button">
            <i className={isCopied ? "fa-solid fa-check" : "fa-regular fa-copy"} />
            <span>{isCopied ? 'Copied!' : ''}</span>
          </button>
          {editor.isEditable && (
            <button
              className="code-block__delete"
              type="button"
              title="Remove code block"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLButtonElement).blur();
                setShowDeleteConfirm(true);
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      <pre>
        <NodeViewContent as="div" className="code-content" spellCheck={false} />
      </pre>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteNode();
          // Do not call editor.commands.focus() here.
          // Tiptap repositions focus automatically after deleteNode().
        }}
        title="Remove code block?"
        message="This will delete the code block and its contents."
        confirmText="Remove"
        type="danger"
      />
    </NodeViewWrapper>
  );
}
