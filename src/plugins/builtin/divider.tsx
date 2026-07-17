import type { CustomElement } from '../../element/types';
import { registerPlugin } from '../registry';
import type { ElementPlugin, RenderContext } from '../types';

export type DividerStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export interface DividerData {
  style: DividerStyle;
}

const WIDTH = 280;
/** Tall enough to grab and resize, though only a line is drawn. */
const HEIGHT = 12;

const DASH: Record<DividerStyle, number[]> = {
  solid: [],
  dashed: [10, 7],
  dotted: [1.5, 5],
  double: [],
};

const DividerIcon = ({ style }: { style: DividerStyle }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    {style === 'double' ? (
      <>
        <path d="M3 8.4h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 11.6h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <path
        d="M3 10h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={style === 'dashed' ? '4 3' : style === 'dotted' ? '0.1 3' : undefined}
      />
    )}
  </svg>
);

const LABEL: Record<DividerStyle, string> = {
  solid: 'Solid divider',
  dashed: 'Dashed divider',
  dotted: 'Dotted divider',
  double: 'Double divider',
};

function makeDividerPlugin(style: DividerStyle): ElementPlugin<DividerData> {
  return {
    id: `divider-${style}`,
    label: LABEL[style],
    category: 'basic',
    description: 'A horizontal rule',
    keywords: ['divider', 'rule', 'line', 'separator', 'hr', 'break', style],
    icon: <DividerIcon style={style} />,
    minSize: { width: 40, height: 8 },

    create({ at }) {
      return {
        x: at.x - WIDTH / 2,
        y: at.y - HEIGHT / 2,
        width: WIDTH,
        height: HEIGHT,
        data: { style },
      };
    },

    render(element: CustomElement<DividerData>, { ctx }: RenderContext) {
      const { width, height } = element;
      const mid = height / 2;

      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.setLineDash(DASH[element.data.style] ?? []);

      if (element.data.style === 'double') {
        // The gap scales with stroke width, so a thick double rule still reads
        // as two lines rather than one blur.
        const gap = Math.max(2, element.strokeWidth * 1.6);
        ctx.beginPath();
        ctx.moveTo(0, mid - gap / 2);
        ctx.lineTo(width, mid - gap / 2);
        ctx.moveTo(0, mid + gap / 2);
        ctx.lineTo(width, mid + gap / 2);
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
    },

    reviveData(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const data = raw as Partial<DividerData>;
      return { style: data.style && data.style in DASH ? data.style : style };
    },
  };
}

for (const style of Object.keys(DASH) as DividerStyle[]) {
  registerPlugin(makeDividerPlugin(style));
}
