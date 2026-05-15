import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { fileApi } from '../../services/api';
import toast from 'react-hot-toast';
import './ImageComponent.css';

// Global map to hold files during optimistic upload
export const pendingImageFiles = new Map<string, File>();

export default function ImageComponent({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const { src, width, height, status, alt } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'error' | 'success'>(status);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Handle optimistic upload
  useEffect(() => {
    if (uploadStatus === 'uploading' && src.startsWith('blob:')) {
      const file = pendingImageFiles.get(src);
      if (file) {
        performUpload(file);
      }
    }
  }, []);

  const performUpload = async (file: File) => {
    // Get noteId from editor storage or props if possible. 
    // In our case, we can try to extract it from the URL or state if needed, 
    // but a better way is to pass it via attributes if we can.
    // For now, let's assume the editor has noteId in its storage or we can find it.
    
    // Fallback: search for noteId in the URL
    const noteId = window.location.pathname.split('/').pop();
    if (!noteId) {
      setUploadStatus('error');
      return;
    }

    try {
      const res = await fileApi.uploadNoteImage(noteId, file);
      const permanentUrl = res.data.url;
      
      // Swap blob for permanent URL and update status
      updateAttributes({
        src: permanentUrl,
        status: 'success'
      });
      setUploadStatus('success');
      pendingImageFiles.delete(src);
    } catch (err) {
      setUploadStatus('error');
      updateAttributes({ status: 'error' });
    }
  };

  const handleRetry = () => {
    const file = pendingImageFiles.get(src);
    if (file) {
      setUploadStatus('uploading');
      updateAttributes({ status: 'uploading' });
      performUpload(file);
    } else {
      toast.error('Source file lost. Please re-upload.');
    }
  };

  /* ── Resizing Logic ── */

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const initialWidth = containerRef.current?.offsetWidth || 0;
    resizeRef.current = {
      startX: e.clientX,
      startWidth: initialWidth,
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [currentWidth]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    
    const deltaX = e.clientX - resizeRef.current.startX;
    const newWidth = Math.max(100, resizeRef.current.startWidth + deltaX);
    
    // strictly local state update for performance
    setCurrentWidth(`${newWidth}px`);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Persist to Tiptap state (metadata update) on mouse up
    if (containerRef.current) {
        updateAttributes({
          width: `${containerRef.current.offsetWidth}px`,
        });
    }
    resizeRef.current = null;
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="image-node-view">
      <div 
        ref={containerRef}
        className={`image-container ${isResizing ? 'image-container--resizing' : ''} ${uploadStatus === 'error' ? 'image-container--error' : ''}`}
        style={{ width: currentWidth, height: height }}
      >
        <img src={src} alt={alt} className="image-node-view__img" />
        
        {uploadStatus === 'uploading' && (
          <div className="image-node-view__loader">
            <i className="fa-solid fa-circle-notch fa-spin" />
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="image-node-view__error-overlay" onClick={handleRetry}>
            <i className="fa-solid fa-rotate-right" />
            <span>Retry Upload</span>
          </div>
        )}

        {/* Delete Button */}
        {editor.isEditable && (
          <button 
            className="image-node-view__delete-btn" 
            onClick={() => deleteNode()}
            title="Delete Image"
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        )}

        {/* Resize Handle */}
        {editor.isEditable && (
          <div 
            className="image-node-view__resize-handle" 
            onMouseDown={onMouseDown}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
