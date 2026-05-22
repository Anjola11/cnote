import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { common, createLowlight } from 'lowlight';
import verilog from 'highlight.js/lib/languages/verilog';
import vhdl from 'highlight.js/lib/languages/vhdl';
import x86asm from 'highlight.js/lib/languages/x86asm';
import { useEffect } from 'react';
import CodeBlockComponent from './CodeBlockComponent';
import { CustomImage } from './ImageExtension';
import { Scripture } from './ScriptureExtension';
import './RichEditor.css';

const lowlight = createLowlight(common);
lowlight.register('verilog', verilog);
lowlight.register('vhdl', vhdl);
lowlight.register('x86asm', x86asm);

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});

/* ── Issue 1: Link Exit Extension ──
 * Uses `appendTransaction` (not keydown interception) so it's IME-safe.
 * After ProseMirror commits a text insertion at the end boundary of a link mark,
 * this plugin strips the link mark from the newly inserted characters.
 * Backspace back into the link is handled automatically by `inclusive: false`. */
const linkExitPluginKey = new PluginKey('linkExit');

const LinkExitExtension = Extension.create({
  name: 'linkExit',

  addProseMirrorPlugins() {
    const linkType = this.editor.schema.marks.link;
    if (!linkType) return [];

    return [
      new Plugin({
        key: linkExitPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          // Only care about transactions that changed the doc
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          const { tr } = newState;
          let modified = false;

          transactions.forEach(transaction => {
            transaction.steps.forEach((step) => {
              // Get the mapped ranges from this step
              const stepMap = step.getMap();
              stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                // Check if newly inserted text at newStart..newEnd has the link mark
                if (newStart >= newEnd) return;

                newState.doc.nodesBetween(newStart, newEnd, (node, pos) => {
                  if (!node.isText) return;

                  // Check if this text node has a link mark
                  const linkMark = node.marks.find(m => m.type === linkType);
                  if (!linkMark) return;

                  // Check if the position is at the end boundary of a link run.
                  // We look at the resolved position at the end of this text range.
                  const nodeEnd = pos + node.nodeSize;
                  const $end = newState.doc.resolve(nodeEnd);

                  // Get what's after this position — if there's no text or the next
                  // character doesn't have the link mark, we're at the trailing edge.
                  const after = $end.nodeAfter;
                  const isAtLinkEnd = !after || !after.marks.some(m => m.type === linkType);

                  if (isAtLinkEnd) {
                    // The newly inserted text is at the end of a link. Strip the mark
                    // from the inserted range only.
                    const removeFrom = Math.max(newStart, pos);
                    const removeTo = Math.min(newEnd, nodeEnd);
                    if (removeFrom < removeTo) {
                      tr.removeMark(removeFrom, removeTo, linkType);
                      modified = true;
                    }
                  }
                });
              });
            });
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

/* ── Issue 2: Heading with auto-generated IDs for anchor navigation ──
 * Extends the Heading extension to output a slugified `id` attribute
 * based on the heading's text content.
 *
 * NOTE: If the heading text changes, existing anchor links will become stale.
 * The correct eventual fix is a ProseMirror `decorations` plugin that recomputes
 * heading IDs on every `onUpdate` — NOT a DOM mutation approach, which would
 * fight TipTap's rendering cycle. Deferred for now. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const HeadingWithId = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as number;
    const text = node.textContent;
    const id = slugify(text) || undefined;
    return [`h${level}`, { ...HTMLAttributes, id }, 0];
  },
});

interface RichEditorProps {
  content: object;
  onUpdate: (content: object) => void;
  onEditorReady?: (editor: any) => void;
  editable?: boolean;
}

export default function RichEditor({ content, onUpdate, onEditorReady, editable = true }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: false,
        // @ts-ignore
        link: false,
        // @ts-ignore
        underline: false,
      }),
      HeadingWithId.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false, // We handle clicks ourselves for anchor support
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'editor-link',
        },
      }),
      LinkExitExtension,
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing…',
      }),
      CustomCodeBlock.configure({
        lowlight,
      }),
      Scripture,
    ],
    content: content as any,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'rich-editor__prose',
        'data-gramm': 'false',
        spellcheck: 'false',
      },
      /* Issue 2: Handle clicks on anchor (#) links with smooth-scroll,
       * and open external links in a new tab. This lives in editorProps
       * rather than a global event listener so it stays scoped to the editor. */
      handleClick(_view, _pos, event) {
        const target = (event.target as HTMLElement).closest('a');
        if (!target) return false;

        const href = target.getAttribute('href');
        if (!href) return false;

        event.preventDefault();

        if (href.startsWith('#')) {
          // Internal anchor link — smooth-scroll to the heading
          const targetId = href.slice(1);
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          // External link — open in new tab
          window.open(href, '_blank', 'noopener,noreferrer');
        }

        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="rich-editor" data-gramm="false" data-enable-grammarly="false">
      <EditorContent editor={editor} />
    </div>
  );
}
