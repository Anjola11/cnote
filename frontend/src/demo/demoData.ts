/**
 * ============================================
 * DEMO MODULE — Delete this entire folder when
 * connecting the real backend.
 * ============================================
 */

import { v4 as uuidv4 } from 'uuid';
import type { User, Entry, ScriptureVerse } from '../types';

export const DEMO_USER: User = {
  id: 'demo-user-001',
  name: 'Alex Okafor',
  email: 'alex@cnote.demo',
};

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

// ─── Tiptap JSON Helpers ─────────────────────────
function text(t: string, marks?: object[]) {
  const node: any = { type: 'text', text: t };
  if (marks) node.marks = marks;
  return node;
}
function paragraph(...children: any[]) {
  return { type: 'paragraph', content: children.length ? children : undefined };
}
function heading(level: number, ...children: any[]) {
  return { type: 'heading', attrs: { level }, content: children };
}
function bulletList(...items: any[]) {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [paragraph(text(item))],
    })),
  };
}
function codeBlock(code: string, language = 'javascript') {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [text(code)],
  };
}
function blockquote(...children: any[]) {
  return { type: 'blockquote', content: children };
}

// ─── Demo Entries ────────────────────────────────
export const DEMO_ENTRIES: Entry[] = [
  {
    id: uuidv4(),
    title: 'Building a REST API with FastAPI',
    category: 'programming',
    excerpt: 'FastAPI is a modern, fast web framework for building APIs with Python 3.7+. Today I explored dependency injection, middleware, and async endpoints...',
    updated_at: hoursAgo(2),
    created_at: daysAgo(3),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Building a REST API with FastAPI')),
        paragraph(
          text('FastAPI is a modern, fast web framework for building APIs with Python 3.7+. Today I explored '),
          text('dependency injection', [{ type: 'bold' }]),
          text(', middleware, and async endpoints.')
        ),
        heading(2, text('Key Takeaways')),
        bulletList(
          'FastAPI auto-generates OpenAPI docs at /docs',
          'Pydantic models handle validation automatically',
          'Dependency injection is cleaner than Flask patterns',
          'Background tasks are built-in — no need for Celery for simple cases'
        ),
        heading(2, text('Example Endpoint')),
        codeBlock(
`from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI()

class EntryCreate(BaseModel):
    title: str
    category: str
    content: dict

@app.post("/entries")
async def create_entry(entry: EntryCreate):
    # Save to database
    return {"id": "new-id", **entry.dict()}`,
          'python'
        ),
        paragraph(
          text('Next up: I want to integrate '),
          text('httpOnly cookie auth', [{ type: 'italic' }]),
          text(' instead of JWT in headers. More secure for browser-based apps.')
        ),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'React useEffect Cleanup Patterns',
    category: 'programming',
    excerpt: 'One of the trickiest parts of React hooks is understanding cleanup functions. Here are the patterns I keep coming back to...',
    updated_at: daysAgo(1),
    created_at: daysAgo(5),
    content: {
      type: 'doc',
      content: [
        heading(1, text('React useEffect Cleanup Patterns')),
        paragraph(text('One of the trickiest parts of React hooks is understanding cleanup functions. Here are the patterns I keep coming back to.')),
        heading(2, text('1. Timer Cleanup')),
        codeBlock(
`useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);

  return () => clearInterval(timer);
}, []);`,
          'typescript'
        ),
        heading(2, text('2. Abort Controller for Fetches')),
        codeBlock(
`useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });

  return () => controller.abort();
}, []);`,
          'typescript'
        ),
        paragraph(text('The key insight: always think about what needs to stop running when the component unmounts.')),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'My Neovim Config Journey',
    category: 'programming',
    excerpt: 'After 6 months of VS Code, I finally made the switch to Neovim. Here is how I configured it from scratch with lazy.nvim...',
    updated_at: daysAgo(4),
    created_at: daysAgo(12),
    content: {
      type: 'doc',
      content: [
        heading(1, text('My Neovim Config Journey')),
        paragraph(text('After 6 months of VS Code, I finally made the switch to Neovim. The learning curve is steep but the payoff is real.')),
        heading(2, text('Plugin Manager: lazy.nvim')),
        paragraph(text('I went with lazy.nvim because it supports lazy-loading out of the box and has a beautiful UI.')),
        heading(2, text('Essential Plugins')),
        bulletList(
          'telescope.nvim — fuzzy finder for everything',
          'nvim-treesitter — syntax highlighting that actually works',
          'lspconfig — connect to language servers',
          'nvim-cmp — autocomplete engine',
          'oil.nvim — file explorer that feels like a buffer'
        ),
        blockquote(paragraph(text('"The best editor is the one you understand deeply."', [{ type: 'italic' }]))),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'Morning Devotional — Psalm 23',
    category: 'spiritual',
    excerpt: 'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters...',
    updated_at: hoursAgo(6),
    created_at: daysAgo(1),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Morning Devotional — Psalm 23')),
        paragraph(text('Today I meditated on Psalm 23 during my quiet time.')),
        blockquote(
          paragraph(
            text('"The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul."', [{ type: 'italic' }])
          )
        ),
        heading(2, text('What This Means to Me')),
        paragraph(text('The image of a shepherd is deeply personal. A shepherd doesn\'t just lead — he protects, provides, and knows each sheep by name.')),
        bulletList(
          'Provision — "I shall not want"',
          'Rest — "green pastures" and "still waters"',
          'Restoration — "He restoreth my soul"',
          'Guidance — "paths of righteousness"'
        ),
        paragraph(
          text('Lord, help me to trust You as my shepherd today. To rest when You say rest, and to follow when You lead. '),
          text('Amen.', [{ type: 'bold' }])
        ),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'Notes on Grace — Ephesians 2:8-9',
    category: 'spiritual',
    excerpt: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God — not of works, lest any man should boast...',
    updated_at: daysAgo(3),
    created_at: daysAgo(7),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Notes on Grace')),
        blockquote(
          paragraph(text('"For by grace are ye saved through faith; and that not of yourselves: it is the gift of God — not of works, lest any man should boast." — Ephesians 2:8-9', [{ type: 'italic' }]))
        ),
        heading(2, text('Grace is Not Earned')),
        paragraph(text('The whole point of grace is that it\'s unearned. The moment I try to "deserve" it, I\'ve missed the point entirely.')),
        heading(2, text('Application')),
        bulletList(
          'Stop trying to perform for God — rest in what He has already done',
          'Extend this same grace to others — they don\'t need to earn my kindness',
          'Grace doesn\'t mean passivity — it\'s the fuel for genuine transformation'
        ),
        paragraph(text('This changes how I approach every relationship. If I\'ve been freely given grace, I should freely give it.')),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'Reflections on Hebrews 11',
    category: 'spiritual',
    excerpt: 'Now faith is the substance of things hoped for, the evidence of things not seen. The "Hall of Faith" chapter is a powerful reminder...',
    updated_at: daysAgo(8),
    created_at: daysAgo(14),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Reflections on Hebrews 11 — The Hall of Faith')),
        blockquote(
          paragraph(text('"Now faith is the substance of things hoped for, the evidence of things not seen." — Hebrews 11:1', [{ type: 'italic' }]))
        ),
        paragraph(text('What strikes me about Hebrews 11 is how ordinary most of these people were. They weren\'t superheroes — they were people who chose to believe God against all evidence.')),
        heading(2, text('Standout Examples')),
        bulletList(
          'Abraham left his homeland without knowing where he was going',
          'Moses chose suffering over the comfort of Egypt',
          'Rahab — a prostitute — was counted among the faithful',
          'Many were persecuted and never saw the fulfillment of the promises'
        ),
        paragraph(
          text('Faith isn\'t the absence of doubt. It\'s the decision to '),
          text('act despite', [{ type: 'bold' }]),
          text(' doubt.')
        ),
      ],
    },
  },
  {
    id: uuidv4(),
    title: '2026 Goals & Quarterly Review',
    category: 'general',
    excerpt: 'It\'s Q2 already. Time to review what I set out to do this year and check my progress honestly...',
    updated_at: hoursAgo(12),
    created_at: daysAgo(2),
    content: {
      type: 'doc',
      content: [
        heading(1, text('2026 Goals & Q2 Review')),
        paragraph(text('It\'s May already. Let me honestly assess where I am on my yearly goals.')),
        heading(2, text('🏋️ Health & Fitness')),
        bulletList(
          '✅ Running 3x per week — consistent since February',
          '⏳ Lose 5kg — down 2kg so far, need to push harder',
          '❌ Daily stretching routine — barely started this'
        ),
        heading(2, text('💻 Technical Skills')),
        bulletList(
          '✅ Build 2 full-stack projects — cnote is project #1!',
          '⏳ Learn Rust basics — read half of "The Book"',
          '✅ Contribute to open source — 3 PRs merged'
        ),
        heading(2, text('📚 Reading')),
        bulletList(
          '✅ Read 12 books this year — currently at 6, on track',
          'Currently reading: "Atomic Habits" by James Clear',
          'Next up: "Designing Data-Intensive Applications"'
        ),
        heading(2, text('Q3 Focus')),
        paragraph(text('The theme for Q3 is consistency over intensity. Small daily wins compound.')),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'Books I Want to Read',
    category: 'general',
    excerpt: 'My ever-growing reading list, organized by priority. Books that have been recommended by people I respect...',
    updated_at: daysAgo(5),
    created_at: daysAgo(20),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Reading List 2026')),
        heading(2, text('🔴 High Priority')),
        bulletList(
          '"Designing Data-Intensive Applications" — Martin Kleppmann',
          '"The Pragmatic Programmer" — Hunt & Thomas',
          '"Deep Work" — Cal Newport'
        ),
        heading(2, text('🟡 Medium Priority')),
        bulletList(
          '"System Design Interview Vol. 2" — Alex Xu',
          '"Refactoring" — Martin Fowler',
          '"The Art of Doing Science and Engineering" — Hamming'
        ),
        heading(2, text('🟢 For Fun')),
        bulletList(
          '"Project Hail Mary" — Andy Weir',
          '"Piranesi" — Susanna Clarke',
          '"The Thursday Murder Club" — Richard Osman'
        ),
        paragraph(
          text('Rule: '),
          text('finish', [{ type: 'bold' }]),
          text(' the current book before starting a new one. No exceptions.')
        ),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'Trip Planning: Lagos → Nairobi',
    category: 'general',
    excerpt: 'Planning my first trip to East Africa. Need to sort out visa, flights, accommodation, and must-visit places in Nairobi...',
    updated_at: daysAgo(2),
    created_at: daysAgo(6),
    content: {
      type: 'doc',
      content: [
        heading(1, text('Lagos → Nairobi Trip Plan')),
        paragraph(text('Planning to visit Nairobi in July. Here\'s what I need to sort out.')),
        heading(2, text('✈️ Flights')),
        bulletList(
          'Lagos → Nairobi (Kenya Airways direct) — ~$350 return',
          'Best prices seem to be mid-week (Tuesday/Wednesday)',
          'Book at least 3 weeks in advance'
        ),
        heading(2, text('🏨 Accommodation')),
        bulletList(
          'Westlands area — lots of restaurants and nightlife',
          'Airbnb budget: $30-50/night',
          'Consider co-living space if staying 2+ weeks'
        ),
        heading(2, text('📍 Must Visit')),
        bulletList(
          'Nairobi National Park — lions with a city skyline backdrop',
          'Giraffe Centre — feed a giraffe!',
          'Karen Blixen Museum',
          'iHub — East Africa\'s tech hub',
          'Carnivore Restaurant — legendary BBQ'
        ),
        heading(2, text('📋 To Do Before Travel')),
        bulletList(
          'Check eVisa requirements for Nigerian passport',
          'Yellow fever vaccination certificate',
          'Get M-Pesa set up on arrival',
          'Download offline maps'
        ),
      ],
    },
  },
  {
    id: uuidv4(),
    title: 'CSS Grid vs Flexbox — When to Use What',
    category: 'programming',
    excerpt: 'I keep going back and forth between Grid and Flexbox. Let me write down the decision framework once and for all...',
    updated_at: daysAgo(6),
    created_at: daysAgo(10),
    content: {
      type: 'doc',
      content: [
        heading(1, text('CSS Grid vs Flexbox')),
        paragraph(text('Finally creating a mental model I can stick with.')),
        heading(2, text('Use Flexbox When...')),
        bulletList(
          'Layout is one-dimensional (row OR column)',
          'Content size should determine layout',
          'You need dynamic wrapping',
          'Navbar items, button groups, card footers'
        ),
        heading(2, text('Use Grid When...')),
        bulletList(
          'Layout is two-dimensional (rows AND columns)',
          'You want the layout to control content placement',
          'Page-level layouts, dashboards, galleries',
          'You need named grid areas'
        ),
        heading(2, text('Quick Example')),
        codeBlock(
`/* Flexbox: Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Grid: Dashboard */
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 60px 1fr;
  gap: 16px;
}`,
          'css'
        ),
        paragraph(
          text('Rule of thumb: '),
          text('Flexbox for components, Grid for layouts.', [{ type: 'bold' }])
        ),
      ],
    },
  },
];

// ─── Demo Scripture Verses ───────────────────────
export const DEMO_SCRIPTURES: ScriptureVerse[] = [
  { reference: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', translation: 'KJV' },
  { reference: 'Psalm 23:1-3', text: 'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul.', translation: 'KJV' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.', translation: 'KJV' },
  { reference: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', translation: 'KJV' },
  { reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.', translation: 'KJV' },
  { reference: 'Proverbs 3:5-6', text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', translation: 'KJV' },
  { reference: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', translation: 'KJV' },
  { reference: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', translation: 'KJV' },
  { reference: 'Psalm 46:10', text: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.', translation: 'KJV' },
  { reference: 'Ephesians 2:8-9', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.', translation: 'KJV' },
  { reference: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.', translation: 'KJV' },
  { reference: 'Romans 12:2', text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.', translation: 'KJV' },
];
