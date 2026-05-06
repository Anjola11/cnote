import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import ConfirmModal from '../ui/ConfirmModal';
import './ScriptureComponent.css';

export default function ScriptureComponent({
  node: { attrs: { reference, translation, text } },
  deleteNode,
}: NodeViewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <NodeViewWrapper className="scripture-block" data-gramm="false">
      <div className="scripture-block__header" contentEditable={false}>
        <div className="scripture-block__info">
          <i className="fa-solid fa-book-bible scripture-block__icon" />
          <span className="scripture-block__ref">{reference} ({translation})</span>
        </div>
        <button
          className="scripture-block__delete"
          type="button"
          title="Remove scripture"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            setShowDeleteConfirm(true);
          }}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="scripture-block__content">
        <p className="scripture-block__text italic">"{text}"</p>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteNode();
          // Do not call editor.commands.focus() here.
          // Tiptap repositions focus automatically after deleteNode().
        }}
        title="Remove scripture?"
        message="This will delete the scripture block and its contents."
        confirmText="Remove"
        type="danger"
      />
    </NodeViewWrapper>
  );
}
