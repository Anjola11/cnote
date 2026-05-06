import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ScriptureComponent from './ScriptureComponent';

export const Scripture = Node.create({
  name: 'scripture',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      reference: { default: '' },
      translation: { default: '' },
      text: { default: '' },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="scripture"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'scripture' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScriptureComponent);
  },
});
