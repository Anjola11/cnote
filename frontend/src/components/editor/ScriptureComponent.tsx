import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import ConfirmModal from '../ui/ConfirmModal';
import './ScriptureComponent.css';

export default function ScriptureComponent({
  node: { attrs: { reference, translation, text } },
  deleteNode,
  editor,
}: NodeViewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <NodeViewWrapper className="scripture-block" data-gramm="false">
      <div className="scripture-block__content">
        <p className="scripture-block__text">"{text}"</p>
        
        <div className="scripture-block__attribution" contentEditable={false}>
          <span className="scripture-block__ref">— {reference} ({translation})</span>
          
          {editor.isEditable && (
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
              <i className="fa-solid fa-trash-can" />
            </button>
          )}
        </div>
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
