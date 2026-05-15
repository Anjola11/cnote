import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageComponent from './ImageComponent';

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          width: attributes.width,
        }),
      },
      height: {
        default: 'auto',
        renderHTML: attributes => ({
          height: attributes.height,
        }),
      },
      status: {
        default: 'success', // 'uploading' | 'error' | 'success'
      },
      fileId: {
        default: null,
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});
