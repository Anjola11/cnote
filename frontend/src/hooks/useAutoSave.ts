import { useRef, useEffect, useCallback } from 'react';
import type { SaveStatus } from '../types';
import { usePatchNote } from './useNotes';

const getHash = (obj: any) => JSON.stringify(obj);

export function useAutoSave(
  noteId: string,
  content: object | null,
  setSaveStatus: (status: SaveStatus) => void,
  enabled: boolean = true
) {
  const { mutateAsync } = usePatchNote();
  
  const lastSavedHash = useRef<string | null>(null);
  const failureCount = useRef(0);
  const isSaving = useRef(false);
  const queuedContent = useRef<object | null>(null);
  
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processQueueRef = useRef<(() => void) | null>(null);
  
  const isFirstRender = useRef(true);

  // Initialize hash on first real content load if we haven't yet
  useEffect(() => {
    if (content && lastSavedHash.current === null) {
      lastSavedHash.current = getHash(content);
    }
  }, [content]);

  const scheduleProbe = useCallback(() => {
    if (probeTimer.current) clearTimeout(probeTimer.current);
    
    // Exponential backoff: 5s, 15s, 30s max
    const attempts = failureCount.current - 3; 
    let delay = 5000;
    if (attempts === 1) delay = 15000;
    if (attempts >= 2) delay = 30000;

    probeTimer.current = setTimeout(async () => {
      const contentToSave = queuedContent.current;
      if (!contentToSave) return;
      
      try {
        await mutateAsync({ id: noteId, data: { content: contentToSave } as any });
        // Success!
        lastSavedHash.current = getHash(contentToSave);
        failureCount.current = 0;
        queuedContent.current = null;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        isSaving.current = false;
        // Start processing queue again if anything new arrived
        if (queuedContent.current && processQueueRef.current) {
           processQueueRef.current();
        }
      } catch {
        failureCount.current += 1;
        scheduleProbe();
      }
    }, delay);
  }, [noteId, mutateAsync, setSaveStatus]);

  const processQueue = useCallback(async () => {
    if (isSaving.current || !queuedContent.current || failureCount.current >= 3) return;

    const contentToSave = queuedContent.current;
    const contentHash = getHash(contentToSave);
    
    // Deduplication check
    if (contentHash === lastSavedHash.current) {
      queuedContent.current = null;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    isSaving.current = true;
    setSaveStatus(failureCount.current > 0 ? 'degraded' : 'saving');
    queuedContent.current = null;

    try {
      await mutateAsync({ id: noteId, data: { content: contentToSave } as any });
      lastSavedHash.current = contentHash;
      failureCount.current = 0;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      // Put the content back in queue if it wasn't overwritten by user typing
      if (!queuedContent.current) {
        queuedContent.current = contentToSave;
      }
      
      failureCount.current += 1;
      
      if (failureCount.current >= 3) {
        setSaveStatus('circuit-open');
        scheduleProbe();
      } else {
        setSaveStatus('degraded');
        setTimeout(() => {
          isSaving.current = false;
          if (processQueueRef.current) processQueueRef.current();
        }, 2000);
        return; // Early return to maintain lock during short retry
      }
    }
    
    isSaving.current = false;
    if (queuedContent.current) {
      processQueue();
    }
  }, [noteId, mutateAsync, setSaveStatus, scheduleProbe]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!content || !enabled) return;

    // Fast deduplication check before queuing
    if (getHash(content) === lastSavedHash.current) return;

    if (failureCount.current < 3) {
      setSaveStatus('unsaved');
    }

    queuedContent.current = content;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // 10s max flush interval
    if (!maxFlushTimer.current) {
      maxFlushTimer.current = setTimeout(() => {
        maxFlushTimer.current = null;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (processQueueRef.current) processQueueRef.current();
      }, 10000);
    }

    // 2s debounce
    debounceTimer.current = setTimeout(() => {
      if (maxFlushTimer.current) {
        clearTimeout(maxFlushTimer.current);
        maxFlushTimer.current = null;
      }
      if (processQueueRef.current) processQueueRef.current();
    }, 2000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [content, enabled, setSaveStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (maxFlushTimer.current) clearTimeout(maxFlushTimer.current);
      if (probeTimer.current) clearTimeout(probeTimer.current);
    };
  }, []);
}
