import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import './HeroSection.css';

export default function HeroSection() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(badgeRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
      .fromTo(headlineRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3')
      .fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2')
      .fromTo(mockupRef.current, { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' }, '-=0.3');
    return () => { tl.kill(); };
  }, []);

  return (
    <section className="hero">
      <div className="hero__content">
        <div ref={badgeRef} className="hero__badge" style={{ opacity: 0 }}>
          <i className="fa-solid fa-wand-magic-sparkles" />
          <span>Your thoughts, beautifully organized</span>
        </div>

        <h1 ref={headlineRef} className="hero__headline" style={{ opacity: 0 }}>
          Write <em>freely.</em><br />Think clearly.
        </h1>

        <p ref={subRef} className="hero__sub" style={{ opacity: 0 }}>
          A journal for the code you write, the verses that move you, and the
          thoughts you want to keep. All in one beautiful place.
        </p>

        <div ref={ctaRef} className="hero__cta" style={{ opacity: 0 }}>
          <Link to="/signup">
            <Button variant="primary" size="lg" icon="fa-solid fa-arrow-right">
              Start writing — it's free
            </Button>
          </Link>
          <a href="#features">
            <Button variant="ghost" size="lg">
              See how it works
            </Button>
          </a>
        </div>

        <div ref={mockupRef} className="hero__mockup" style={{ opacity: 0 }}>
          <div className="hero__mockup-frame">
            <div className="hero__mockup-toolbar">
              <div className="hero__mockup-dots">
                <span /><span /><span />
              </div>
              <span className="hero__mockup-tab">Morning Devotional — Psalm 23</span>
            </div>
            <div className="hero__mockup-content">
              <div className="hero__mockup-badge">
                <i className="fa-solid fa-book-bible" />
                <span>Spiritual</span>
              </div>
              <h3>Morning Devotional — Psalm 23</h3>
              <p className="hero__mockup-text">
                Today I meditated on Psalm 23 during my quiet time.
              </p>
              <blockquote>
                "The Lord is my shepherd; I shall not want. He maketh me to lie
                down in green pastures: he leadeth me beside the still waters."
              </blockquote>
              <h4>What This Means to Me</h4>
              <p className="hero__mockup-text">
                The image of a shepherd is deeply personal. A shepherd doesn't
                just lead — he protects, provides, and knows each sheep by name.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
