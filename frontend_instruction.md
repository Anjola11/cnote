# Journal App — Full Frontend Technical Implementation Spec

> For AI Agent Use. Follow every instruction in sequence. Do not skip sections.

---

## 0. Project Overview & Philosophy

You are building a **personal rich-text journal web app** with three entry categories: Programming, Spiritual, and General. The app has a Landing Page, Login, Signup, a Feed (home), and an Editor. It must feel polished, modern, and minimal — like Notion and Linear had a child raised on Bear.app.

**Design language:**

- Mobile-first. Every screen designed at 375px first, then enhanced at 768px and 1280px+.
- Dark/light theme toggle with smooth GSAP transitions. Default to system preference.
- Font stack: `"DM Serif Display"` for headings and hero copy (Google Fonts), `"DM Sans"` for body/UI text.
- Color palette (CSS variables):
  - `--bg`: `#FAFAF8` (light) / `#0F0F0E` (dark)
  - `--bg-secondary`: `#F2F1EE` (light) / `#1A1A18` (dark)
  - `--bg-card`: `#FFFFFF` (light) / `#1E1E1C` (dark)
  - `--text-primary`: `#111110` (light) / `#F0EFEC` (dark)
  - `--text-secondary`: `#6B6A65` (light) / `#8A8982` (dark)
  - `--text-muted`: `#A8A79F` (light) / `#5A5950` (dark)
  - `--accent`: `#2563EB` — electric blue, used for CTAs and active states
  - `--accent-light`: `#EFF6FF` (light) / `#1E2A3A` (dark)
  - `--border`: `#E5E4DE` (light) / `#2A2A28` (dark)
  - `--danger`: `#DC2626`
  - `--success`: `#16A34A`
  - Category colours:
    - Programming: `--cat-prog`: `#2563EB` (blue)
    - Spiritual: `--cat-spirit`: `#7C3AED` (violet)
    - General: `--cat-general`: `#D97706` (amber)
- Icon library: **Font Awesome 6 Free** (CDN or npm). Use `fa-solid` icons throughout.
- Animations: **GSAP 3** + **ScrollTrigger** plugin. No CSS keyframe animations except for micro-interactions (hover, focus ring pulses). All entrance animations, page transitions, and theme switches go through GSAP.
- Border radius system: `--radius-sm: 6px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-xl: 28px`.
- Shadow system: `--shadow-sm: 0 1px 3px rgba(0,0,0,0.06)`, `--shadow-md: 0 4px 16px rgba(0,0,0,0.08)`, `--shadow-lg: 0 12px 40px rgba(0,0,0,0.12)`.

---

## 1. Tech Stack & Dependencies

### Install everything via npm/yarn:

```bash
npm create vite@latest journal-app -- --template react-ts
cd journal-app
npm install

# Routing
npm install react-router-dom

# Data fetching & caching
npm install @tanstack/react-query

# Editor
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-heading @tiptap/extension-text-style
npm install @tiptap/extension-color @tiptap/extension-font-family
npm install @tiptap/extension-underline @tiptap/extension-strike
npm install @tiptap/extension-blockquote @tiptap/extension-image
npm install @tiptap/extension-bullet-list @tiptap/extension-ordered-list
npm install @tiptap/extension-code-block-lowlight
npm install lowlight

# Code syntax highlighting (inside code block)
npm install @codemirror/view @codemirror/state @codemirror/lang-javascript
npm install @codemirror/lang-python @codemirror/lang-cpp @codemirror/theme-one-dark

# GSAP
npm install gsap

# Font Awesome
npm install @fortawesome/fontawesome-free

# Utilities
npm install clsx date-fns uuid
npm install @types/uuid --save-dev

# HTTP
npm install axios
```

### Google Fonts — add to `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
  rel="stylesheet"
/>
```

### Font Awesome — add to `index.html` `<head>`:

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
/>
```

---

## 2. Folder Structure

```
src/
├── assets/
│   └── logo.svg               # App logo — a simple quill pen SVG
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── Spinner.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── PageWrapper.tsx
│   ├── feed/
│   │   ├── EntryCard.tsx
│   │   └── CategoryFilter.tsx
│   ├── editor/
│   │   ├── RichEditor.tsx
│   │   ├── Toolbar.tsx
│   │   ├── SaveStatus.tsx
│   │   ├── CodeBlockExtension.tsx
│   │   └── ScriptureBlock.tsx
│   └── landing/
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       └── FooterSection.tsx
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── FeedPage.tsx
│   └── EditorPage.tsx
├── hooks/
│   ├── useTheme.ts
│   ├── useAutoSave.ts
│   └── useEntries.ts
├── context/
│   └── ThemeContext.tsx
├── services/
│   └── api.ts
├── types/
│   └── index.ts
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── animations.css
├── App.tsx
└── main.tsx
```

---

## 3. Global Styles & CSS Variables

### `src/styles/variables.css`

Define ALL CSS custom properties here. Apply `[data-theme="dark"]` on the `<html>` element to switch themes.

```css
:root {
  --bg: #fafaf8;
  --bg-secondary: #f2f1ee;
  --bg-card: #ffffff;
  --text-primary: #111110;
  --text-secondary: #6b6a65;
  --text-muted: #a8a79f;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --border: #e5e4de;
  --danger: #dc2626;
  --success: #16a34a;
  --cat-prog: #2563eb;
  --cat-spirit: #7c3aed;
  --cat-general: #d97706;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.12);
  --transition: 0.2s ease;
  --font-heading: "DM Serif Display", Georgia, serif;
  --font-body: "DM Sans", system-ui, sans-serif;
}

[data-theme="dark"] {
  --bg: #0f0f0e;
  --bg-secondary: #1a1a18;
  --bg-card: #1e1e1c;
  --text-primary: #f0efec;
  --text-secondary: #8a8982;
  --text-muted: #5a5950;
  --accent-light: #1e2a3a;
  --border: #2a2a28;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.36);
}
```

### `src/styles/globals.css`

Import variables.css at top. Then:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html {
  scroll-behavior: smooth;
}
body {
  font-family: var(--font-body);
  background-color: var(--bg);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1,
h2,
h3 {
  font-family: var(--font-heading);
}
a {
  color: inherit;
  text-decoration: none;
}
button {
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
}
input,
textarea {
  font-family: inherit;
}
img {
  display: block;
  max-width: 100%;
}
```

---

## 4. Theme System & Toggle

### `src/context/ThemeContext.tsx`

- Create a `ThemeContext` with `{ theme: 'light' | 'dark', toggleTheme: () => void }`.
- On mount, read `localStorage.getItem('theme')` OR `window.matchMedia('(prefers-color-scheme: dark)').matches`.
- Set `document.documentElement.setAttribute('data-theme', theme)` whenever theme changes.
- Wrap `App.tsx` with `<ThemeProvider>`.

### `src/hooks/useTheme.ts`

Simple hook: `const { theme, toggleTheme } = useContext(ThemeContext)`.

### `src/components/ui/ThemeToggle.tsx`

- A circular button, 36×36px.
- **Light mode icon:** `<i className="fa-solid fa-sun" />` — amber yellow (#F59E0B).
- **Dark mode icon:** `<i className="fa-solid fa-moon" />` — indigo (#818CF8).
- On click: call `toggleTheme()`, then run a GSAP animation:
  ```ts
  gsap.fromTo(
    buttonRef.current,
    { rotate: 0, scale: 1 },
    {
      rotate: 360,
      scale: 1.15,
      duration: 0.4,
      ease: "back.out(1.7)",
      onComplete: () => gsap.set(buttonRef.current, { rotate: 0 }),
    },
  );
  ```
- Simultaneously, GSAP animates the entire `<html>` background colour: use `gsap.to(document.documentElement, { '--bg': newBg, duration: 0.5, ease: 'power2.inOut' })`. Actually, since CSS vars don't animate with GSAP by default, instead apply a CSS transition on the body:
  ```css
  body,
  * {
    transition:
      background-color 0.4s ease,
      color 0.3s ease,
      border-color 0.3s ease;
  }
  ```
  Toggle the `data-theme` attribute immediately, CSS transitions handle the rest. GSAP only handles the icon spin.

---

## 5. Reusable UI Components

### `src/components/ui/Button.tsx`

Props: `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `size: 'sm' | 'md' | 'lg'`, `loading?: boolean`, `icon?: string` (Font Awesome class string e.g. `"fa-solid fa-plus"`), `fullWidth?: boolean`, plus all native button props.

Styles:

- Primary: `background: var(--accent)`, white text, `border-radius: var(--radius-md)`, `box-shadow: 0 2px 8px rgba(37,99,235,0.3)`.
- Secondary: transparent bg, `border: 1px solid var(--border)`, `color: var(--text-primary)`.
- Ghost: no border, no bg, `color: var(--text-secondary)`, hover shows bg `var(--bg-secondary)`.
- Danger: `background: var(--danger)`, white text.
- Sizes: sm = 32px height, md = 40px height, lg = 48px height. Padding scales accordingly.
- Loading state: replace icon/text with `<Spinner />` of matching size.
- On hover: lift with `transform: translateY(-1px)`, `box-shadow` increases slightly. Use CSS transition 0.15s.
- On click (active): `transform: translateY(0)`, `box-shadow` drops back.
- If `icon` prop passed and text also passed: icon renders left of text, 8px gap.
- If only `icon` prop: square button.

### `src/components/ui/Input.tsx`

Props: `label?: string`, `error?: string`, `icon?: string`, `type`, `placeholder`, all native input props.

Styles:

- Height: 44px. `border-radius: var(--radius-md)`.
- Border: `1px solid var(--border)`. Focus border: `var(--accent)`, with focus ring `box-shadow: 0 0 0 3px rgba(37,99,235,0.15)`.
- Background: `var(--bg-card)`.
- If `icon` prop: icon is absolutely positioned left inside the input container, input gets `padding-left: 40px`.
- `label` renders above as `<label>` in `DM Sans 500` 14px.
- `error` renders below as small red text `var(--danger)` 12px, with a `<i className="fa-solid fa-circle-exclamation" />` prefix icon.
- Error state changes border to `var(--danger)`.
- Animate error message in with GSAP `fromTo({ opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2 })`.

### `src/components/ui/Badge.tsx`

Props: `category: 'programming' | 'spiritual' | 'general'`.

Each badge:

- Programming: blue bg (`var(--accent-light)`), blue text (`var(--cat-prog)`), icon `fa-solid fa-code`.
- Spiritual: violet bg (`rgba(124,58,237,0.1)`), violet text (`var(--cat-spirit)`), icon `fa-solid fa-bible`.
- General: amber bg (`rgba(217,119,6,0.1)`), amber text (`var(--cat-general)`), icon `fa-solid fa-feather`.
- Shape: pill, `border-radius: 999px`, padding `4px 10px`, font-size 12px, font-weight 500.
- Icon is 10px, 6px gap before text.

### `src/components/ui/Card.tsx`

Wrapper div: `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, `padding: 20px`, `box-shadow: var(--shadow-sm)`.
On hover: `box-shadow: var(--shadow-md)`, `border-color: rgba(37,99,235,0.2)`. Transition 0.2s.

### `src/components/ui/Modal.tsx`

- Renders via React portal into `document.body`.
- Backdrop: full-screen fixed div, `background: rgba(0,0,0,0.4)`, `backdrop-filter: blur(4px)`.
- Modal box: centered, `max-width: 480px`, `width: calc(100% - 32px)`, `background: var(--bg-card)`, `border-radius: var(--radius-xl)`, `padding: 28px`, `box-shadow: var(--shadow-lg)`.
- GSAP entrance: backdrop fades in from 0 opacity. Modal box slides up from y+20 and fades in, `duration: 0.35`, `ease: "expo.out"`.
- GSAP exit: reverse — modal slides down to y+10 and fades out, then backdrop fades. Trigger exit via a `isOpen` boolean prop.
- Close icon: `fa-solid fa-xmark` top-right, 20px, `color: var(--text-muted)`.
- Clicking backdrop closes modal.
- Trap focus inside modal when open (for accessibility).

### `src/components/ui/Spinner.tsx`

A simple spinning `<i className="fa-solid fa-spinner fa-spin" />` or a custom CSS spinner using `var(--accent)` colour. Size via a `size` prop (sm/md/lg). Use `fa-spin` class from Font Awesome.

---

## 6. Layout Components

### `src/components/layout/Navbar.tsx`

Used on all authenticated screens (Feed, Editor). NOT shown on Landing, Login, Signup.

Structure (mobile-first):

- Fixed top, full width. Height: 56px on mobile, 60px on desktop.
- Background: `var(--bg-card)`, `border-bottom: 1px solid var(--border)`.
- `backdrop-filter: blur(12px)` + `background: rgba(var(--bg-card-rgb), 0.85)` — gives a frosted glass effect. Define `--bg-card-rgb` as rgb values separately for this to work.
- Left side: App logo (`<img src={logo} alt="Journal" />`, 28px tall) + app name "Folio" in `DM Serif Display` 18px bold.
- Right side: `ThemeToggle` component, then an avatar circle — 32px circle, `var(--accent)` background, white initials of the user's name (from auth state). Clicking avatar opens a small dropdown with "Settings" and "Log out".
- Avatar dropdown: positioned absolutely below avatar, `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-lg)`. Items are 40px tall, `color: var(--text-primary)`. "Log out" item has `color: var(--danger)` and icon `fa-solid fa-arrow-right-from-bracket`. Animate in with GSAP: `fromTo({ opacity: 0, y: -8, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' })`.
- On mobile: same structure, but logo text hidden if space is tight (only show icon).

### `src/components/layout/PageWrapper.tsx`

A div that wraps all page content with:

- `min-height: 100vh`.
- `padding-top: 56px` (accounts for fixed navbar) on authenticated pages.
- Max content width: `1200px`, centered with `margin: 0 auto`.
- Horizontal padding: `16px` on mobile, `24px` on tablet, `40px` on desktop.
- GSAP page entrance: on mount, animate children container from `{ opacity: 0, y: 16 }` to `{ opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }`.

---

## 7. Landing Page

### `src/pages/LandingPage.tsx`

This page has NO navbar. It has its own standalone navigation header.

#### 7.1 Landing Navbar

- Fixed top. Height 60px. Full width.
- Background: transparent initially, transitions to `var(--bg-card)` + `border-bottom` on scroll past 80px. Use GSAP `ScrollTrigger` for this:
  ```ts
  ScrollTrigger.create({
    start: "top -80px",
    onEnter: () =>
      gsap.to(navRef.current, {
        backgroundColor: "var(--bg-card)",
        duration: 0.3,
      }),
    onLeaveBack: () =>
      gsap.to(navRef.current, {
        backgroundColor: "transparent",
        duration: 0.3,
      }),
  });
  ```
- Left: Logo + "Folio" name.
- Right: `ThemeToggle`, then "Log in" Ghost button, then "Get Started" Primary button.
- On mobile: "Log in" and "Get Started" collapse into a hamburger icon `fa-solid fa-bars`. Clicking it slides down a full-width menu drawer from the top with both buttons.

#### 7.2 Hero Section (`src/components/landing/HeroSection.tsx`)

Full viewport height (`min-height: 100vh`) centered content.

Background:

- Light mode: a subtle radial gradient mesh — `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 60%, rgba(124,58,237,0.05) 0%, transparent 60%), var(--bg)`.
- Dark mode: same but with higher opacity gradients (`0.12` and `0.08`).

Content structure (centered column):

1. A small pill badge above the headline: `fa-solid fa-sparkles` icon + text "Your thoughts, beautifully organized". Style: `background: var(--accent-light)`, `color: var(--accent)`, pill shape, 13px font, 500 weight.
2. Headline: `h1` — "Write freely. Think clearly." — `DM Serif Display`, 52px on desktop / 36px on mobile, `line-height: 1.15`, `color: var(--text-primary)`. The word "freely" is in an italic style via `<em>` tag (DM Serif Display has a beautiful italic).
3. Sub-headline: `p` — "A journal for the code you write, the verses that move you, and the thoughts you want to keep. All in one beautiful place." — `DM Sans` 18px / 16px mobile, `color: var(--text-secondary)`, max-width 520px, centered.
4. CTA row: "Start writing — it's free" Primary button (lg size, icon `fa-solid fa-arrow-right`) + "See how it works" Ghost button. On mobile, stack vertically.
5. A floating mockup preview below: a `div` that looks like the app's editor on a subtle device frame — shadow, rounded corners 20px, `border: 1px solid var(--border)`. Show a static screenshot or a hardcoded HTML replica of an entry card. On desktop it's 720px wide, centered. On mobile, 100% width.

GSAP entrance sequence (staggered, fires on page load):

```ts
const tl = gsap.timeline({ delay: 0.1 });
tl.fromTo(
  badgeRef.current,
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
)
  .fromTo(
    headlineRef.current,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
    "-=0.3",
  )
  .fromTo(
    subRef.current,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    "-=0.3",
  )
  .fromTo(
    ctaRef.current,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
    "-=0.2",
  )
  .fromTo(
    mockupRef.current,
    { opacity: 0, y: 40, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "expo.out" },
    "-=0.3",
  );
```

#### 7.3 Features Section (`src/components/landing/FeaturesSection.tsx`)

Three feature cards in a row (stacked on mobile). Each card shows:

- Programming: icon `fa-solid fa-code` in blue circle, title "Code that breathes", description about syntax-highlighted code blocks with language selection.
- Spiritual: icon `fa-solid fa-bible` in violet circle, title "Scripture at your fingertips", description about searching and embedding Bible verses inline.
- General: icon `fa-solid fa-feather` in amber circle, title "Free-form writing", description about rich text — bold, italic, images, quotes.

Card styles: same as `Card.tsx` component. Icon circle: 48px, `border-radius: 50%`, colour-matched background at 10% opacity.

GSAP ScrollTrigger: as each card scrolls into view, it animates from `{ opacity: 0, y: 40 }` to `{ opacity: 1, y: 0 }` with a 0.1s stagger between cards:

```ts
gsap.fromTo(
  cardsRef.current.children,
  { opacity: 0, y: 40 },
  {
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.12,
    ease: "power2.out",
    scrollTrigger: { trigger: cardsRef.current, start: "top 80%" },
  },
);
```

Section heading: `DM Serif Display`, 36px / 28px mobile. Centered. Short supporting paragraph below in `--text-secondary`.

#### 7.4 Footer Section (`src/components/landing/FooterSection.tsx`)

Simple, minimal. Single row on desktop, stacked on mobile.

- Left: Logo + "Folio" + tagline "Write. Reflect. Grow."
- Right: "Privacy" and "Terms" links in `--text-muted`, "Made with `fa-solid fa-heart` in Nigeria" in `--text-muted`. Heart icon is red `#EF4444`.
- `border-top: 1px solid var(--border)`, padding 32px 0, `color: var(--text-muted)`, font-size 14px.

---

## 8. Login Page

### `src/pages/LoginPage.tsx`

Two-column layout on desktop (≥768px): left half is a full-height brand panel, right half is the form. On mobile: only the form, no brand panel.

#### Left Brand Panel (desktop only)

- `width: 50%`, `min-height: 100vh`.
- Background: `linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #7C3AED 100%)`.
- Center-aligned vertically and horizontally.
- Large italic headline in `DM Serif Display` white: _"Words outlast everything."_
- Below: three small feature bullets with white icons:
  - `fa-solid fa-lock-open` — "Private and secure"
  - `fa-solid fa-bolt` — "Instant autosave"
  - `fa-solid fa-palette` — "Beautiful by default"
    Each bullet: icon + text side by side, `rgba(255,255,255,0.85)` text, 15px.
- Decorative: a large semi-transparent quill pen icon `fa-solid fa-feather-pointed` at 200px, `opacity: 0.06`, positioned absolutely bottom-right of the panel — gives subtle texture without noise.

GSAP entrance (brand panel): headline letter-by-letter is too heavy — instead fade-slide each element in sequence on mount.

#### Right Form Panel

- `width: 50%` on desktop / `100%` on mobile. `min-height: 100vh`. Centers content.
- Top: Logo + "Folio" (linked to `/`).
- Heading: "Welcome back" in `DM Serif Display` 30px.
- Sub: "Don't have an account? [Sign up →]" link in `--accent`.

Form fields (using `Input.tsx`):

1. **Email** — label "Email address", icon `fa-solid fa-envelope`, type email.
2. **Password** — label "Password", icon `fa-solid fa-lock`, type password. Include a show/hide toggle inside the input's right side: `fa-solid fa-eye` / `fa-solid fa-eye-slash`, 16px, `color: var(--text-muted)`, clicking it toggles input type.
3. **Forgot password?** link — right-aligned below the password field, 13px, `color: var(--accent)`.
4. **Submit button** — full width, primary, lg size, label "Log in", icon `fa-solid fa-arrow-right-to-bracket`. Shows spinner when loading.
5. **Error banner** — if login fails, show a red banner above the submit button: `background: rgba(220,38,38,0.1)`, `border: 1px solid rgba(220,38,38,0.3)`, `border-radius: var(--radius-md)`, `padding: 12px 16px`, icon `fa-solid fa-circle-exclamation` red, then error message text. Animate in with GSAP `fromTo({ opacity: 0, height: 0 }, { opacity: 1, height: 'auto', duration: 0.3 })`.

GSAP page entrance: form elements fade and slide up with stagger 0.07s. Start delay 0.15s.

Mobile layout: everything is `100%` width. No brand panel. Add a subtle gradient strip at the very top 6px tall using the same blue-violet gradient as the brand panel (like a top accent bar).

---

## 9. Signup Page

### `src/pages/SignupPage.tsx`

Same two-column layout as Login. Brand panel left, form right.

Brand panel is the same visual treatment but the headline changes to: _"Start your story today."_

Form fields:

1. **Full Name** — icon `fa-solid fa-user`, type text, placeholder "Aanu Adeyemi".
2. **Email** — icon `fa-solid fa-envelope`, type email.
3. **Password** — icon `fa-solid fa-lock`, with show/hide toggle.
4. **Confirm Password** — icon `fa-solid fa-lock-keyhole`, with show/hide toggle. If it doesn't match, show inline error below the field: "Passwords do not match".

Password strength meter — appears below the password field once user starts typing:

- A 4-segment bar (`display: flex`, `gap: 4px`, each segment `height: 4px`, `border-radius: 2px`, `flex: 1`, `background: var(--border)` by default).
- Strength rules: length ≥ 8 = 1 segment lit. Has uppercase = +1. Has number = +1. Has symbol = +1.
- Colour: 1 segment = red (`#EF4444`), 2 = orange (`#F97316`), 3 = yellow (`#EAB308`), 4 = green (`var(--success)`).
- Below the bar, small text: "Weak" / "Fair" / "Good" / "Strong" matching the colour.

Below the form:

- "Already have an account? [Log in]" link.
- Terms text: "By signing up, you agree to our Terms and Privacy Policy." — 12px, `--text-muted`.

Submit button: "Create account", icon `fa-solid fa-user-plus`, full width, primary lg.

Same GSAP stagger entrance as login.

---

## 10. Feed Page

### `src/pages/FeedPage.tsx`

Authenticated. Uses `Navbar.tsx` + `PageWrapper.tsx`.

#### Layout on desktop (≥768px):

- Two regions: a thin left sidebar 260px fixed + main content area filling the rest.
- Sidebar has: App logo/name, "New Entry" button, then a vertical nav list with category filters.
- On mobile: sidebar collapses — show only the "New Entry" button in a floating action button (FAB) at bottom-right, and put category filters in a horizontal scrollable chip row below the page title.

#### Sidebar (desktop)

- `position: fixed`, left 0, `width: 260px`, full height, `background: var(--bg-secondary)`, `border-right: 1px solid var(--border)`.
- Top: Logo + "Folio" name, 20px padding.
- "New Entry" button: full width, primary, md, icon `fa-solid fa-plus`, text "New Entry". `margin: 16px 0`.
- Filter nav list:
  - "All Entries" — icon `fa-solid fa-layer-group`, `color: var(--text-secondary)`.
  - "Programming" — icon `fa-solid fa-code`, `color: var(--cat-prog)`.
  - "Spiritual" — icon `fa-solid fa-bible`, `color: var(--cat-spirit)`.
  - "General" — icon `fa-solid fa-feather`, `color: var(--cat-general)`.
  - Each item: full-width, 44px tall, `border-radius: var(--radius-md)`, `padding: 0 12px`, `display: flex; align-items: center; gap: 10px`.
  - Active state: `background: var(--accent-light)`, text and icon use their accent colours. A 3px vertical pill on the left edge using `border-left: 3px solid var(--accent)` OR the category colour.
  - Hover: `background: var(--bg-card)`.
- Bottom of sidebar: `ThemeToggle` + user avatar + display name.

#### Main Content Area

- `margin-left: 260px` on desktop / `margin-left: 0` on mobile.
- `padding: 32px 40px` on desktop / `16px` on mobile.

Page header row:

- Left: Dynamic heading — "All Entries" / "Programming" / etc. in `DM Serif Display` 26px.
- Right: A search input (compact, 280px wide, icon `fa-solid fa-magnifying-glass`) to filter entries by title client-side. On mobile this becomes a search icon that expands into a full-width input on click with GSAP width animation.

Entry count: below the heading, in `--text-muted` 13px: "24 entries" (or "3 programming entries").

#### Category Filter Bar (mobile only)

Horizontal scrollable chip row. Chips use same design as sidebar items but pill-shaped and smaller. Hidden on desktop.

#### Entry Cards Grid

On desktop: 2-column CSS grid, `gap: 16px`. On mobile: 1 column.
On tablet (768px–1100px): 1 column (the layout still has the sidebar).

On the very first load, cards animate in with GSAP stagger from bottom:

```ts
gsap.fromTo(
  cardsContainer.current.children,
  { opacity: 0, y: 24 },
  {
    opacity: 1,
    y: 0,
    duration: 0.4,
    stagger: 0.06,
    ease: "power2.out",
    delay: 0.1,
  },
);
```

When the category filter changes, existing cards fade out (`opacity 0, scale 0.97, duration 0.2`) then new cards fade in with the same entrance animation.

#### `src/components/feed/EntryCard.tsx`

Props: `entry: { id, title, category, excerpt, updated_at }`.

Card structure (using `Card.tsx` wrapper):

1. Top row: `Badge` (category) left-aligned + date right-aligned in `--text-muted` 12px formatted as "May 4" or "Yesterday" (use `date-fns` `formatRelative` or `format`).
2. Title: `DM Serif Display` 18px, `color: var(--text-primary)`, `line-height: 1.35`. Truncate at 2 lines with `-webkit-line-clamp: 2`.
3. Excerpt: `DM Sans` 14px, `color: var(--text-secondary)`, `line-height: 1.55`, truncate at 3 lines with `-webkit-line-clamp: 3`.
4. Bottom row: a row of action icons (visible on hover, opacity 0 → 1 on card hover using CSS transition):
   - `fa-solid fa-pen-to-square` — opens editor.
   - `fa-solid fa-trash` — triggers delete confirm modal.
     Both are ghost icon buttons, 32px, `color: var(--text-muted)`, hover `color: var(--text-primary)`.
5. Clicking anywhere on the card (except action buttons) navigates to `/editor/:id`.

Card hover: transform `translateY(-2px)`, `box-shadow: var(--shadow-md)`, `border-color: rgba(37,99,235,0.2)`. CSS transition 0.2s.

Empty state: if no entries match the filter, show a centered illustration:

- A large `fa-solid fa-book-open` icon, 64px, `color: var(--text-muted)`.
- Heading: "Nothing here yet" in `DM Serif Display` 22px.
- Sub: "Tap 'New Entry' to start writing." in `--text-secondary` 15px.
- Primary button "New Entry" below.

Loading skeleton: while data fetches, show 6 placeholder `Card.tsx` containers with animated shimmer blocks in place of title and excerpt. Use CSS animation:

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    var(--bg-secondary) 50%,
    var(--border) 75%
  );
  background-size: 200%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
```

#### New Entry Modal — Category Picker

When "New Entry" is clicked, open a `Modal.tsx`.

Inside the modal:

- Heading: "What kind of entry?" in `DM Serif Display` 22px.
- Three large option cards in a column (on mobile) or row (on desktop), each 100% width / equal flex on desktop:
  - Programming: `fa-solid fa-code` icon (40px, blue), title "Programming", sub "Code snippets, technical notes, dev logs."
  - Spiritual: `fa-solid fa-bible` icon (40px, violet), title "Spiritual", sub "Reflections, devotionals, scripture notes."
  - General: `fa-solid fa-feather` icon (40px, amber), title "General", sub "Thoughts, plans, life notes."
  - Each card: `border: 2px solid var(--border)`, `border-radius: var(--radius-lg)`, `padding: 20px`, cursor pointer.
  - On hover: border colour changes to the category colour. Background tints to category's alpha.
  - GSAP: on hover enter `gsap.to(card, { scale: 1.02, duration: 0.15 })`, on leave `gsap.to(card, { scale: 1, duration: 0.15 })`.
  - On click: call `POST /entries`, then navigate to `/editor/:newId` and close the modal.

#### Mobile FAB (Floating Action Button)

On mobile only: a 56×56 circle, `position: fixed`, bottom 24px, right 24px. Background `var(--accent)`, white icon `fa-solid fa-plus` (20px). `box-shadow: 0 4px 20px rgba(37,99,235,0.4)`. On click, opens the same category picker modal.
GSAP entrance on page load: `fromTo({ scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.5 })`.

---

## 11. Editor Page

### `src/pages/EditorPage.tsx`

Authenticated. Route: `/editor/:id`.

Load the entry via `GET /entries/:id` using React Query. While loading, show a full-page centered `Spinner`.

#### Layout

- No sidebar on the editor page — full screen is for writing.
- `Navbar.tsx` is shown at top.
- Below navbar: a single centered column, `max-width: 740px`, `width: 100%`, `margin: 0 auto`, `padding: 0 16px`.
- This is a "long-form writing" feel — generous whitespace, narrow content column.

#### Title Input

- A raw `<input type="text">` above the editor, completely unstyled (remove all default input styles).
- Font: `DM Serif Display` 32px on desktop / 24px on mobile. `color: var(--text-primary)`.
- Placeholder: "Untitled" in `color: var(--text-muted)`.
- `border: none`, `outline: none`, `background: transparent`, `width: 100%`, `margin-bottom: 4px`.
- On blur or after 800ms debounce, fires `PATCH /entries/:id` with `{ title: newTitle }`.

#### Metadata Row

Below the title: a small row showing:

- `Badge` component (category).
- A separator dot `·` in `--text-muted`.
- "Last saved" time in `--text-muted` 13px, e.g. "Saved 2 minutes ago" (use `date-fns` `formatDistanceToNow`). This auto-updates every 30 seconds using `setInterval`.

#### Save Status Indicator (`src/components/editor/SaveStatus.tsx`)

A small fixed/sticky indicator — top right of the editor area (not the navbar):

States:

- **Unsaved** (`'unsaved'`): grey dot + "Unsaved" in `--text-muted` 13px. Dot blinks with CSS animation.
- **Saving** (`'saving'`): blue spinner `fa-solid fa-spinner fa-spin` in `var(--accent)` + "Saving…".
- **Saved** (`'saved'`): green checkmark `fa-solid fa-check-circle` in `var(--success)` + "Saved". Fades to nothing after 2s.
- **Error** (`'error'`): red `fa-solid fa-triangle-exclamation` in `var(--danger)` + "Save failed".

GSAP status transitions: when status changes, `fromTo({ opacity: 0, x: 6 }, { opacity: 1, x: 0, duration: 0.2 })`.

#### Toolbar (`src/components/editor/Toolbar.tsx`)

Sticky below the metadata row. Stays visible as user scrolls.

Style: `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, `padding: 8px 12px`, `display: flex`, `align-items: center`, `gap: 2px`, `box-shadow: var(--shadow-sm)`.

On mobile: the toolbar scrolls horizontally — `overflow-x: auto`, `flex-wrap: nowrap`. Use `-webkit-overflow-scrolling: touch` and hide scrollbar with `::-webkit-scrollbar { display: none }`.

Toolbar button style: 32×32px, `border-radius: var(--radius-sm)`, transparent background. Active state (format is applied): `background: var(--accent-light)`, icon `color: var(--accent)`. Hover: `background: var(--bg-secondary)`. All use Font Awesome icons.

Toolbar structure (left to right with `|` indicating a 1px divider):

```
H1  H2  H3  |  B  I  U  S  |  color-picker  font-size  |  bullet-list  ordered-list  blockquote  |  image  |  [code-block OR scripture — conditional]
```

Icon mapping:

- H1: `fa-solid fa-heading` (or use text "H1" in 11px bold)
- H2: text "H2"
- H3: text "H3"
- Bold: `fa-solid fa-bold`
- Italic: `fa-solid fa-italic`
- Underline: `fa-solid fa-underline`
- Strikethrough: `fa-solid fa-strikethrough`
- Bullet list: `fa-solid fa-list-ul`
- Ordered list: `fa-solid fa-list-ol`
- Blockquote: `fa-solid fa-quote-left`
- Image: `fa-solid fa-image`
- Code block (Programming only): `fa-solid fa-terminal`
- Scripture (Spiritual only): `fa-solid fa-bible`

Dividers: `<span style="width: 1px, height: 20px, background: var(--border), margin: 0 4px" />`.

Colour picker: clicking the colour button opens a small floating popover with 8 preset swatches + the browser native colour picker. Position it absolutely below the button. Close on click outside. Use GSAP to animate in from `scale(0.9)` at transform-origin top-left.

Font size: a `<select>` element styled to match the toolbar buttons. Options: 12, 14, 16, 18, 20, 24, 28, 32 (px).

#### Rich Editor Area (`src/components/editor/RichEditor.tsx`)

The Tiptap editor.

Tiptap `EditorContent` wrapper styles:

- `min-height: 70vh`.
- `padding: 16px 0 120px 0` (bottom padding so toolbar doesn't cover last line on mobile).
- Focus state: no outline on the wrapper — Tiptap handles it internally.

Tiptap ProseMirror styles (in `globals.css`):

```css
.ProseMirror {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.75;
  color: var(--text-primary);
  outline: none;
}
.ProseMirror p {
  margin-bottom: 12px;
}
.ProseMirror h1 {
  font-family: var(--font-heading);
  font-size: 28px;
  margin: 28px 0 12px;
}
.ProseMirror h2 {
  font-family: var(--font-heading);
  font-size: 22px;
  margin: 24px 0 10px;
}
.ProseMirror h3 {
  font-family: var(--font-heading);
  font-size: 18px;
  margin: 20px 0 8px;
}
.ProseMirror strong {
  font-weight: 600;
}
.ProseMirror em {
  font-style: italic;
  color: var(--text-secondary);
}
.ProseMirror blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
  margin-left: 0;
  color: var(--text-secondary);
  font-style: italic;
}
.ProseMirror ul,
.ProseMirror ol {
  padding-left: 24px;
  margin-bottom: 12px;
}
.ProseMirror li {
  margin-bottom: 4px;
}
.ProseMirror img {
  border-radius: var(--radius-md);
  max-width: 100%;
  margin: 16px 0;
}
.ProseMirror .is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
  float: left;
  height: 0;
}
```

Placeholder: "Start writing…" (use Tiptap's `Placeholder` extension if needed, or a CSS approach).

Code block styles:

```css
.ProseMirror pre {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  overflow-x: auto;
  font-family: "Fira Code", "Cascadia Code", monospace;
  font-size: 14px;
  line-height: 1.6;
  margin: 16px 0;
}
.ProseMirror pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}
```

Code block has a language selector header: a thin bar above the `<pre>` block showing the current language (e.g. "JavaScript") as a small badge, with a dropdown to switch language. The dropdown shows options: JavaScript, TypeScript, Python, C++, Bash, SQL, HTML, CSS, JSON. This is a custom Tiptap node extension (`src/components/editor/CodeBlockExtension.tsx`). Use `lowlight` for syntax highlighting (see Tiptap docs for `CodeBlockLowlight`).

#### Scripture Block (`src/components/editor/ScriptureBlock.tsx`)

Visible ONLY when `entry.category === 'spiritual'`.

When user clicks the `fa-solid fa-bible` toolbar button, a modal opens (using `Modal.tsx`):

- Heading: `fa-solid fa-bible` icon + "Search Scripture" in `DM Serif Display`.
- A search input with icon `fa-solid fa-magnifying-glass` and placeholder "e.g. John 3:16, Psalm 23".
- Below: search results list — as user types (debounced 300ms), call `GET /scripture/search?q=...` and display verse results. Each result:
  - Book + chapter:verse reference in `DM Sans` 13px bold `--accent`.
  - Verse text in 14px `--text-primary`.
  - On click: insert the verse as a custom Tiptap node into the editor, then close modal.
- Inserted scripture block renders in the editor as a styled card:
  ```
  ┌──────────────────────────────────────┐
  │ 📖  John 3:16 (NIV)                  │
  │ "For God so loved the world..."       │
  └──────────────────────────────────────┘
  ```
  Styles: `background: rgba(124,58,237,0.05)`, `border-left: 3px solid var(--cat-spirit)`, `border-radius: var(--radius-md)`, `padding: 14px 16px`. Reference in `DM Sans` 12px bold violet. Verse text in `DM Serif Display` italic 16px `--text-primary`.

#### Autosave Hook (`src/hooks/useAutoSave.ts`)

```ts
// Parameters: entryId, content (Tiptap JSON), setSaveStatus
// Logic:
// 1. On every content change, call setSaveStatus('unsaved') and reset a 800ms timer.
// 2. When timer fires, call setSaveStatus('saving') and PATCH /entries/:id.
// 3. On success: setSaveStatus('saved'), then after 2000ms setSaveStatus('idle').
// 4. On error: setSaveStatus('error').
// Use useRef for the timer to persist across renders.
// Clean up the timer on unmount.
```

#### Delete Button in Editor

In the Navbar area on the editor page, add a secondary icon button `fa-solid fa-trash` in `--danger`. On click: open a small confirmation modal (using `Modal.tsx`) — "Delete this entry? This cannot be undone." — with a Cancel (ghost) and "Delete" (danger) button. On confirm: call `DELETE /entries/:id`, navigate back to `/feed`, and invalidate React Query cache.

---

## 12. Routing & Auth Guard

### `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext";

const queryClient = new QueryClient();

function RequireAuth({ children }) {
  const token = localStorage.getItem("auth_token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/feed"
              element={
                <RequireAuth>
                  <FeedPage />
                </RequireAuth>
              }
            />
            <Route
              path="/editor/:id"
              element={
                <RequireAuth>
                  <EditorPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## 13. API Service Layer

### `src/services/api.ts`

Use `axios` with a base instance:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true, // Send cookies automatically
});
```

Add a request interceptor to attach the JWT if stored in localStorage (for non-cookie auth), or rely on `withCredentials` for httpOnly cookies — match your backend implementation.

Add a response interceptor: on 401 response, clear `localStorage.auth_token` and redirect to `/login`.

Export typed functions:

```ts
export const entriesApi = {
  list: (category?: string) =>
    api.get("/entries", { params: { category, limit: 20 } }),
  get: (id: string) => api.get(`/entries/${id}`),
  create: (category: string) =>
    api.post("/entries", {
      category,
      title: "Untitled",
      content: { type: "doc", content: [] },
    }),
  patch: (id: string, data: Partial<Entry>) =>
    api.patch(`/entries/${id}`, data),
  delete: (id: string) => api.delete(`/entries/${id}`),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  signup: (name: string, email: string, password: string) =>
    api.post("/auth/signup", { name, email, password }),
  logout: () => api.post("/auth/logout"),
};

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const scriptureApi = {
  search: (q: string) => api.get("/scripture/search", { params: { q } }),
};
```

---

## 14. Types

### `src/types/index.ts`

```ts
export type Category = "programming" | "spiritual" | "general";
export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
export type Theme = "light" | "dark";

export interface EntryCard {
  id: string;
  title: string;
  category: Category;
  excerpt: string;
  updated_at: string;
}

export interface Entry extends EntryCard {
  content: object; // Tiptap JSON doc
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
```

---

## 15. React Query Hooks

### `src/hooks/useEntries.ts`

```ts
// useEntries(category?) — queries ['entries', category], calls entriesApi.list()
// useEntry(id) — queries ['entry', id], calls entriesApi.get()
// useCreateEntry() — mutation, calls entriesApi.create(), on success navigates to /editor/:id and invalidates ['entries']
// usePatchEntry() — mutation, calls entriesApi.patch(), on success invalidates ['entries'] and ['entry', id]
// useDeleteEntry() — mutation, calls entriesApi.delete(), on success invalidates ['entries'] and navigates to /feed
```

---

## 16. GSAP Initialisation

### `src/main.tsx`

Register GSAP plugins once at the app root:

```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
```

---

## 17. Responsive Breakpoints

Use these consistently in CSS/Tailwind (or plain CSS media queries):

```css
/* Mobile first — base styles target ≤767px */
@media (min-width: 768px) {
  /* Tablet */
}
@media (min-width: 1024px) {
  /* Desktop */
}
@media (min-width: 1280px) {
  /* Wide desktop */
}
```

Key responsive behaviours summary:
| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| Feed sidebar | Hidden | Hidden | 260px fixed left |
| Feed grid | 1 col | 1 col | 2 col |
| Editor column | 100% - 32px | 680px centered | 740px centered |
| Toolbar | Horizontal scroll | Full | Full |
| Landing hero headline | 36px | 44px | 52px |
| Login/Signup | Form only, full height | Form + small panel | 50/50 split |
| Navbar height | 56px | 56px | 60px |

---

## 18. Accessibility Notes

- All icon-only buttons must have `aria-label` attributes: e.g. `aria-label="Toggle theme"`, `aria-label="Delete entry"`.
- Form inputs have associated `<label>` elements via `htmlFor`/`id`.
- Modal uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal heading.
- Focus is trapped inside modal when open. Return focus to trigger element on close.
- Colour contrast: all text colours chosen above meet AA contrast ratio against their backgrounds. Verify with a contrast checker during implementation.
- `prefers-reduced-motion`: wrap all GSAP animations in a check:
  ```ts
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // All GSAP animations here
  });
  ```

---

## 19. Environment Variables

In `/.env.local`:

```
VITE_API_URL=http://localhost:8000/api
```

Access via `import.meta.env.VITE_API_URL` anywhere in the app. Never commit this file.

---

## 20. Final Checklist Before Shipping

- [ ] All pages render correctly at 375px, 768px, 1280px viewport widths.
- [ ] Dark/light theme transition is smooth — no flash of wrong theme on initial load (read `localStorage` before React hydrates by setting `data-theme` in a `<script>` tag in `index.html` before the `<body>`).
- [ ] GSAP ScrollTrigger instances are properly killed in cleanup functions (`useEffect` return).
- [ ] React Query mutations show loading spinners in buttons.
- [ ] Autosave debounce timer is cleared on component unmount.
- [ ] Category-conditional toolbar items (code block, scripture) only appear for the right category.
- [ ] Scripture search has its own 300ms debounce, separate from autosave.
- [ ] Empty state shown when entries list is empty.
- [ ] Skeleton loaders shown while data fetches.
- [ ] All Font Awesome icons have correct class names: `fa-solid fa-xxx` (not `fas fa-xxx` for FA6).
- [ ] No `console.error` or unhandled promise rejections in the browser.
- [ ] `RequireAuth` guard redirects unauthenticated users to `/login`.
