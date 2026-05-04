import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import clsx from 'clsx';
import './PageWrapper.css';

interface PageWrapperProps {
  children: React.ReactNode;
  withNavbar?: boolean;
  className?: string;
  maxWidth?: string;
}

export default function PageWrapper({
  children,
  withNavbar = true,
  className,
  maxWidth,
}: PageWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div
      className={clsx('page-wrapper', withNavbar && 'page-wrapper--with-navbar', className)}
      style={maxWidth ? { maxWidth } : undefined}
    >
      <div ref={contentRef} className="page-wrapper__content">
        {children}
      </div>
    </div>
  );
}
