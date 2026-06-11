import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import './TableBubbleMenu.css';

interface TableBubbleMenuProps {
  editor: Editor;
}

export default function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [anchorRect, setAnchorRect] = useState<{
    tableTop: number;
    tableRight: number;
    editorTop: number;
    editorLeft: number;
  } | null>(null);

  useEffect(() => {
    const update = () => {
      if (!editor.isEditable || !editor.isActive('table')) {
        setVisible(false);
        setAnchorRect(null);
        return;
      }

      const { view } = editor;
      const { from } = view.state.selection;
      const domAtPos = view.domAtPos(from);
      const node = domAtPos.node as HTMLElement;

      // Walk up to find the <table> element
      const tableEl =
        node.nodeType === 1
          ? (node as HTMLElement).closest('table')
          : node.parentElement?.closest('table');

      if (!tableEl) {
        setVisible(false);
        return;
      }

      const tableRect = tableEl.getBoundingClientRect();
      const editorRect = view.dom.getBoundingClientRect();

      setAnchorRect({
        tableTop: tableRect.top,
        tableRight: tableRect.right,
        editorTop: editorRect.top,
        editorLeft: editorRect.left,
      });
      setVisible(true);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  // Position after the menu is rendered in the DOM so we can measure its width
  useLayoutEffect(() => {
    if (!visible || !anchorRect) return;
    const menuWidth = menuRef.current?.offsetWidth ?? 200;
    setPos({
      top: anchorRect.tableTop - anchorRect.editorTop - 40,
      left: anchorRect.tableRight - anchorRect.editorLeft - menuWidth,
    });
  }, [visible, anchorRect]);

  if (!visible) return null;

  const run = (cmd: () => boolean) => {
    cmd();
    editor.commands.focus();
  };

  return (
    <div
      ref={menuRef}
      className="table-bubble"
      style={{ top: pos.top, left: pos.left }}
      // Stop clicks from blurring the editor
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Column ops */}
      <MenuBtn icon="fa-solid fa-table-columns" label="Add column before" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} />
      <MenuBtn icon="fa-solid fa-table-columns" label="Add column after"  onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} />
      <MenuBtn icon="fa-solid fa-table-columns" label="Delete column"     onClick={() => run(() => editor.chain().focus().deleteColumn().run())} danger />

      <Divider />

      {/* Row ops */}
      <MenuBtn icon="fa-solid fa-table-list" label="Add row above" onClick={() => run(() => editor.chain().focus().addRowBefore().run())} />
      <MenuBtn icon="fa-solid fa-table-list" label="Add row below" onClick={() => run(() => editor.chain().focus().addRowAfter().run())} />
      <MenuBtn icon="fa-solid fa-table-list" label="Delete row"    onClick={() => run(() => editor.chain().focus().deleteRow().run())} danger />

      <Divider />

      {/* Table-level ops */}
      <MenuBtn icon="fa-solid fa-trash-can" label="Delete table" onClick={() => run(() => editor.chain().focus().deleteTable().run())} danger />
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`table-bubble__btn ${danger ? 'table-bubble__btn--danger' : ''}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      type="button"
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );
}

function Divider() {
  return <span className="table-bubble__divider" />;
}
