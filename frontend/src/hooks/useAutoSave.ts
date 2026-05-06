import { useRef, useEffect, useCallback } from 'react';
import type { SaveStatus } from '../types';
import { usePatchEntry } from './useEntries';

export function useAutoSave(
  entryId: string,
  content: object | null,
  setSaveStatus: (status: SaveStatus) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchEntry = usePatchEntry();
  const isFirstRender = useRef(true);

  const save = useCallback(async (contentToSave: object) => {
    setSaveStatus('saving');
    try {
      await patchEntry.mutateAsync({ id: entryId, data: { content: contentToSave } as any });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [entryId, patchEntry, setSaveStatus]);

  useEffect(() => {
    // Skip the first render (initial content load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!content) return;

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
