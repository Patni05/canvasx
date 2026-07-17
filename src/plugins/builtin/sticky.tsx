import { wrapText } from '../../element/text';
import type { CustomElement } from '../../element/types';
import { registerPlugin } from '../registry';
import type { ElementPlugin, RenderContext } from '../types';

export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple';

export interface StickyData {
  text: string;
  color: StickyColor;
}

/**
 * Paper colours, and the ink that stays readable on each. Dark mode inverts the
 * canvas, so these are authored for light and come out as muted darks — which
 * is what a sticky should look like on black anyway.
 */
export const STICKY_PALETTE: Record<StickyColor, { paper: string; edge: string; ink: string }> = {
  yellow: { paper: '#fff3bf', edge: '#f5e08a', ink: '#5c4813' },
  pink: { paper: '#ffdeeb', edge: '#f7c8db', ink: '#6b2843' },
  green: { paper: '#d3f9d8', edge: '#b6ecc0', ink: '#1f4d29' },
  blue: { paper: '#d0ebff', edge: '#aed8f7', ink: '#123a5c' },
  purple: { paper: '#e5dbff', edge: '#cfc0f7', ink: '#3c2a68' },
};

const SIZE = 180;
const PADDING = 14;
const FONT_SIZE = 16;
const LINE_HEIGHT = 1.35;

const StickyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3.6 4.4a1 1 0 0 1 1-1h10.8a1 1 0 0 1 1 1v7L12 16.6H4.6a1 1 0 0 1-1-1z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* The turned-up corner is what makes it read as a sticky rather than a box. */}
    <path d="M16.4 11.4H12v4.8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const sticky: ElementPlugin<StickyData> = {
  id: 'sticky',
  label: 'Sticky note',
  category: 'basic',
  description: 'A note you can pile ideas onto',
  keywords: ['note', 'postit', 'post-it', 'memo', 'idea', 'brainstorm'],
  icon: <StickyIcon />,
  minSize: { width: 80, height: 80 },

  create({ at }) {
    return {
      x: at.x - SIZE / 2,
      y: at.y - SIZE / 2,
      width: SIZE,
      height: SIZE,
      data: { text: '', color: 'yellow' },
    };
  },

  searchText: (element) => element.data.text,

  render(element: CustomElement<StickyData>, { ctx }: RenderContext) {
    const palette = STICKY_PALETTE[element.data.color] ?? STICKY_PALETTE.yellow;
    const { width, height } = element;

    // A soft drop shadow is what sells "a piece of paper resting on the canvas".
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const text = element.data.text;
    if (text.trim() === '') {
      ctx.fillStyle = palette.ink;
      ctx.globalAlpha = 0.35;
      ctx.font = `italic ${FONT_SIZE}px Caveat, cursive`;
      ctx.textBaseline = 'top';
      ctx.fillText('Double-click to write', PADDING, PADDING);
      return;
    }

    ctx.fillStyle = palette.ink;
    ctx.font = `${FONT_SIZE}px Caveat, cursive`;
    ctx.textBaseline = 'alphabetic';

    const maxWidth = width - PADDING * 2;
    const lines = wrapText(text, FONT_SIZE, 1, maxWidth);
    const step = FONT_SIZE * LINE_HEIGHT;
    // Clip rather than overflow: a note that spills past its own paper looks
    // broken. Resizing it is the fix, and the user can see they need to.
    const maxLines = Math.max(1, Math.floor((height - PADDING * 2) / step));

    lines.slice(0, maxLines).forEach((line, index) => {
      ctx.fillText(line, PADDING, PADDING + index * step + FONT_SIZE * 0.8);
    });

    if (lines.length > maxLines) {
      ctx.globalAlpha = 0.5;
      ctx.fillText('…', PADDING, PADDING + maxLines * step + FONT_SIZE * 0.8);
    }
  },

  reviveData(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Partial<StickyData>;
    return {
      text: typeof data.text === 'string' ? data.text : '',
      color: data.color && data.color in STICKY_PALETTE ? data.color : 'yellow',
    };
  },
};

registerPlugin(sticky);
