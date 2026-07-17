import { invalidateInteractive } from './render';

interface LaserPoint {
  x: number;
  y: number;
  t: number;
}

const DECAY_MS = 1000;
const GLOW_WIDTH = 14;
const CORE_WIDTH = 3.5;
/** The bright dot at the pointer itself, like a real presentation laser. */
const TIP_RADIUS = 4;

/**
 * A real laser pointer is a hard bright dot inside a soft halo. A white core
 * reads as a highlighter and washes out on light canvas, so the core carries
 * the colour and the halo only adds presence around it.
 */
const CORE_COLOR = '#b00020';
const GLOW_COLOR = '#ff1a3c';

/**
 * The laser is ephemeral: it never enters the scene, never enters history and
 * never exports. It lives entirely on the interactive layer.
 */
const trail: LaserPoint[] = [];

export function addLaserPoint(sceneX: number, sceneY: number): void {
  trail.push({ x: sceneX, y: sceneY, t: performance.now() });
  invalidateInteractive();
}

export function clearLaser(): void {
  trail.length = 0;
}

/** Keeps the RAF loop alive so the tail fades out after the pointer stops. */
export const laserHasTrail = (): boolean => trail.length > 0;

/** Ease the fade so the tail thins away smoothly instead of stepping out. */
const fade = (life: number): number => life * life;

export function drawLaser(ctx: CanvasRenderingContext2D, now: number, zoom: number): void {
  while (trail.length > 0 && now - trail[0].t > DECAY_MS) trail.shift();
  if (trail.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Two passes: the whole halo first, then the whole core over it. Per-segment
  // alternation let each segment's halo wash over its neighbour's core and
  // muddied the line.
  for (const [color, width, alpha] of [
    [GLOW_COLOR, GLOW_WIDTH, 0.28],
    [CORE_COLOR, CORE_WIDTH, 1],
  ] as const) {
    for (let i = 1; i < trail.length; i++) {
      const life = fade(1 - (now - trail[i].t) / DECAY_MS);
      if (life <= 0) continue;

      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      // Widths are divided by zoom so the beam stays constant on screen.
      ctx.globalAlpha = life * alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = (width * life) / zoom;
      ctx.stroke();
    }
  }

  // The hard tip at the pointer, which is what makes it read as a laser rather
  // than a brush stroke.
  const tip = trail[trail.length - 1];
  const tipLife = fade(1 - (now - tip.t) / DECAY_MS);
  if (tipLife > 0) {
    ctx.globalAlpha = tipLife * 0.3;
    ctx.fillStyle = GLOW_COLOR;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, (TIP_RADIUS * 2.4) / zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = tipLife;
    ctx.fillStyle = CORE_COLOR;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, TIP_RADIUS / zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
