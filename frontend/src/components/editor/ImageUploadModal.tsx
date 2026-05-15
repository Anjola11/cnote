import { useState, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { pendingImageFiles } from './ImageComponent';
import './ImageUploadModal.css';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (attrs: { src: string; status?: 'uploading' | 'success'; width?: string }) => void;
  noteId: string;
}

export default function ImageUploadModal({ isOpen, onClose, onInsert, noteId }: ImageUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      onInsert({ src: imageUrl.trim(), status: 'success' });
      setImageUrl('');
      onClose();
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    // Optimistic UI Pattern
    const blobUrl = URL.createObjectURL(file);
    pendingImageFiles.set(blobUrl, file);
    
    // Insert with local preview instantly
    onInsert({ 
      src: blobUrl, 
      status: 'uploading',
      width: '100%' 
    });
    
    onClose();
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [noteId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Insert Image">
      <div className="image-upload-modal">
        <div className="image-upload-modal__tabs">
          <button 
            className={`image-upload-modal__tab ${activeTab === 'upload' ? 'image-upload-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
          <button 
            className={`image-upload-modal__tab ${activeTab === 'url' ? 'image-upload-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            By URL
          </button>
        </div>

        <div className="image-upload-modal__content">
          {activeTab === 'upload' ? (
            <div 
              className={`image-upload-modal__dropzone ${isDragging ? 'image-upload-modal__dropzone--dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
                accept="image/*"
              />
              <>
                <i className="fa-solid fa-cloud-arrow-up" />
                <p className="image-upload-modal__drop-text">Drag and drop an image, or click to browse</p>
                <p className="image-upload-modal__hint">Supports JPG, PNG, WebP, GIF, AVIF (Max 10MB)</p>
              </>
            </div>
          ) : (
            <form className="image-upload-modal__url-form" onSubmit={handleUrlSubmit}>
              <div className="image-upload-modal__url-input-wrapper">
                <i className="fa-solid fa-link" />
                <input 
                  type="url" 
                  placeholder="https://example.com/image.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={!imageUrl.trim()}>
                Insert Image
              </Button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
