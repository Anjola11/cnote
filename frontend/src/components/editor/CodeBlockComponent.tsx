import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
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
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const [isCopied, setIsCopied] = useState(false);

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
    <NodeViewWrapper className="code-block">
      <div className="code-block__header" contentEditable={false}>
        <select
          className="code-block__language"
          value={defaultLanguage || 'null'}
          onChange={handleLanguageChange}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        
        <button className="code-block__copy" onClick={handleCopy} title="Copy code" type="button">
          <i className={isCopied ? "fa-solid fa-check" : "fa-regular fa-copy"} />
          <span>{isCopied ? 'Copied!' : ''}</span>
        </button>
      </div>
      
      <pre>
        <NodeViewContent as="div" className="code-content" />
      </pre>
    </NodeViewWrapper>
  );
}
