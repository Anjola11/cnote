import { useState, useEffect } from 'react';

async function hasRealInternet(): Promise<boolean> {
  try {
    await fetch('https://www.gstatic.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Monitors the browser's online/offline state reactively,
 * including connection quality and real internet access ping.
 * Returns `true` when online and verified, `false` otherwise.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (navigator.onLine) {
        const real = await hasRealInternet();
        if (isMounted) setIsVerified(real);
      } else {
        if (isMounted) setIsVerified(false);
      }
    };

    // Initial verification
    verify();

    // Periodic verification every 15 seconds to catch silent WAN drops
    const interval = setInterval(verify, 15000);

    // Layer 1: instant OS-level detection
    const handleOffline = () => {
      setIsOnline(false);
      setIsVerified(false);
    };
    
    const handleOnline = () => {
      setIsOnline(true);
      verify();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Layer 2: connection quality degradation
    const conn = (navigator as any).connection;
    const handleConnChange = () => {
      if (conn?.effectiveType === 'slow-2g') {
        setIsVerified(false);
      } else {
        if (navigator.onLine) {
          hasRealInternet().then(setIsVerified);
        }
      }
    };
    conn?.addEventListener('change', handleConnChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      conn?.removeEventListener('change', handleConnChange);
    };
  }, []);

  return isOnline && isVerified;
}
