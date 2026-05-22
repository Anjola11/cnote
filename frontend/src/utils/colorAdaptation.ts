/**
 * Color adaptation utilities for dark mode.
 *
 * Strategy: HSL Lightness Mirroring.
 * Convert inline hex colors to HSL, mirror the lightness around 50%,
 * preserving hue and saturation exactly. This ensures colored text
 * remains recognizable across themes (red stays red, blue stays blue)
 * while maintaining readability against the background.
 *
 * The original color is always stored in `data-original-color` so we
 * can revert cleanly and never double-mirror on fast theme toggles.
 */

/**
 * Parse a hex color string to HSL components.
 * Accepts #RGB, #RRGGBB, or bare hex.
 */
export function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l * 100];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue: number;
  switch (max) {
    case r:
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      hue = ((b - r) / d + 2) / 6;
      break;
    default:
      hue = ((r - g) / d + 4) / 6;
      break;
  }

  return [hue * 360, s * 100, l * 100];
}

/** Convert HSL components back to a hex color string. */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r: number, g: number, b: number;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adapt a single hex color for dark mode by mirroring its lightness.
 *
 * L_dark = 100 - L_light, clamped to [55, 95] to ensure readability
 * on dark backgrounds without blowing out to pure white.
 */
export function adaptColorForDarkMode(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const newL = Math.min(95, Math.max(55, 100 - l));
  return hslToHex(h, s, newL);
}

/**
 * Extract a hex color from a CSS color string.
 * Handles hex (#abc, #aabbcc) and rgb(r, g, b) formats.
 * Returns null if the format isn't recognized.
 */
function parseColorToHex(color: string): string | null {
  const trimmed = color.trim().toLowerCase();

  // Hex format
  if (trimmed.startsWith('#')) {
    // Validate it's a proper hex
    const bare = trimmed.slice(1);
    if (/^[0-9a-f]{3}$/.test(bare) || /^[0-9a-f]{6}$/.test(bare)) {
      return trimmed;
    }
    return null;
  }

  // rgb(r, g, b) format
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return null;
}

/**
 * Walk the editor DOM and adapt (or revert) inline-colored spans for dark mode.
 *
 * IMPORTANT: Always reads from `data-original-color` if it exists, falling
 * back to `style.color` only on first application. This prevents double-mirroring
 * when the user toggles themes rapidly.
 *
 * @param editorDom - The editor's root DOM element (e.g. editor.view.dom)
 * @param isDark    - Whether the current theme is dark
 */
export function adaptEditorColors(editorDom: HTMLElement, isDark: boolean): void {
  const spans = editorDom.querySelectorAll<HTMLElement>('span[style*="color"]');

  spans.forEach((span) => {
    if (isDark) {
      // Read the original color — always prefer data-original-color
      const original = span.dataset.originalColor || parseColorToHex(span.style.color);
      if (!original) return;

      // Store the original if we haven't already
      if (!span.dataset.originalColor) {
        span.dataset.originalColor = original;
      }

      // Apply the adapted color
      const adapted = adaptColorForDarkMode(original);
      span.style.color = adapted;
    } else {
      // Revert to original color
      const original = span.dataset.originalColor;
      if (original) {
        span.style.color = original;
        delete span.dataset.originalColor;
      }
    }
  });
}
