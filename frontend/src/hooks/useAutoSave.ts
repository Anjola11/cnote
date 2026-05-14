import { useRef, useEffect, useCallback } from 'react';
import type { SaveStatus } from '../types';
import { usePatchNote } from './useNotes';

export function useAutoSave(
  noteId: string,
  content: object | null,
  setSaveStatus: (status: SaveStatus) => void,
  enabled: boolean = true
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync } = usePatchNote();
  const isFirstRender = useRef(true);

  const save = useCallback(async (contentToSave: object) => {
    setSaveStatus('saving');
    try {
      await mutateAsync({ id: noteId, data: { content: contentToSave } as any });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [noteId, mutateAsync, setSaveStatus]);

  useEffect(() => {
    // Skip the first render (initial content load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!content || !enabled) return;

    setSaveStatus('unsaved');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      save(content);
    }, 800);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, save, setSaveStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
