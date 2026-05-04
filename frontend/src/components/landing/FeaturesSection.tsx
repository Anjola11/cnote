import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import Card from '../ui/Card';
import { useTheme } from '../../hooks/useTheme';
import './FeaturesSection.css';

const FEATURES = [
  {
    icon: 'fa-solid fa-code',
    title: 'Code that breathes',
    description: 'Syntax-highlighted code blocks with language selection. Write technical notes with real formatting — Python, TypeScript, CSS, and more.',
    light: { color: 'var(--cat-prog)', bg: 'rgba(37, 99, 235, 0.1)' },
    dark: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' }
  },
  {
    icon: 'fa-solid fa-book-bible',
    title: 'Scripture at your fingertips',
    description: 'Search and embed Bible verses inline. Build your devotional journal with beautifully formatted scripture blocks.',
    light: { color: 'var(--cat-spirit)', bg: 'rgba(124, 58, 237, 0.1)' },
    dark: { color: '#7C6FD4', bg: '#3D3580' }
  },
  {
    icon: 'fa-solid fa-feather',
    title: 'Free-form writing',
    description: 'Rich text with bold, italic, images, quotes, and hyperlinks. Your thoughts deserve a beautiful canvas.',
    light: { color: 'var(--cat-general)', bg: 'rgba(217, 119, 6, 0.1)' },
    dark: { color: '#F0A500', bg: '#3D2E00' }
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!cardsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current!.children,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out',
          scrollTrigger: { trigger: cardsRef.current, start: 'top 80%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" className="features" ref={sectionRef}>
      <div className="features__header">
        <h2 className="features__title">Three journals, one home</h2>
        <p className="features__sub">
          Organize your thoughts across code, faith, and life — each with tools
          built for the way you think.
        </p>
      </div>

      <div className="features__grid" ref={cardsRef}>
        {FEATURES.map((feature) => {
          const style = theme === 'dark' ? feature.dark : feature.light;
          return (
            <Card key={feature.title} hoverable={false} className="features__card">
              <div
                className="features__icon-circle"
                style={{ background: style.bg, color: style.color }}
              >
                <i className={feature.icon} />
              </div>
              <h3 className="features__card-title">{feature.title}</h3>
              <p className="features__card-desc">{feature.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
