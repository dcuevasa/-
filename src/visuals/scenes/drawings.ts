import { GalleryHorizontalEnd } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear, randomRange, TAU, wrap } from '../utils/canvas';

type DrawingSheet = {
  title: string;
  lines: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  scale: number;
  fold: number;
  seed: number;
};

const drawingModules = import.meta.glob('../../../docs/dibujo/*.{md,txt}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function cleanDrawing(content: string) {
  return content
    .replace(/^```\w*\n?/, '')
    .replace(/```\s*$/m, '')
    .trimEnd()
    .split('\n');
}

function titleFromPath(path: string) {
  return (path.split('/').at(-1) ?? 'dibujo.txt')
    .replace(/\.[^.]+$/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createSheet(path: string, content: string, index: number, width: number, height: number): DrawingSheet {
  return {
    title: titleFromPath(path),
    lines: cleanDrawing(content),
    x: randomRange(-width, width),
    y: randomRange(height * 0.18, height * 0.82),
    vx: randomRange(22, 58),
    vy: randomRange(-8, 10),
    angle: randomRange(-0.22, 0.22),
    spin: randomRange(-0.18, 0.18),
    scale: randomRange(0.72, 0.95),
    fold: randomRange(-0.4, 0.4),
    seed: index * 19.31,
  };
}

function drawSheet(context: CanvasRenderingContext2D, sheet: DrawingSheet, time: number) {
  const longestLine = Math.max(...sheet.lines.map((line) => [...line].length));
  const fontSize = 8.5 * sheet.scale;
  const lineHeight = fontSize * 1.18;
  const sheetWidth = Math.max(180, longestLine * fontSize * 0.74 + 36);
  const sheetHeight = Math.max(130, sheet.lines.length * lineHeight + 52);
  const curl = Math.sin(time * 1.8 + sheet.seed) * 14 + sheet.fold * 16;

  context.save();
  context.translate(sheet.x, sheet.y);
  context.rotate(sheet.angle);

  context.fillStyle = 'rgba(255, 250, 234, 0.9)';
  context.strokeStyle = 'rgba(78, 58, 42, 0.22)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-sheetWidth / 2, -sheetHeight / 2);
  context.bezierCurveTo(-sheetWidth * 0.12, -sheetHeight / 2 - curl, sheetWidth * 0.2, -sheetHeight / 2 + curl, sheetWidth / 2, -sheetHeight / 2 + curl * 0.25);
  context.bezierCurveTo(sheetWidth / 2 + curl * 0.4, -sheetHeight * 0.12, sheetWidth / 2 - curl * 0.4, sheetHeight * 0.18, sheetWidth / 2, sheetHeight / 2);
  context.bezierCurveTo(sheetWidth * 0.18, sheetHeight / 2 + curl * 0.45, -sheetWidth * 0.16, sheetHeight / 2 - curl * 0.3, -sheetWidth / 2, sheetHeight / 2);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(43, 35, 30, 0.78)';
  context.font = `${fontSize}px "SFMono-Regular", "Consolas", "Noto Color Emoji", monospace`;
  context.textBaseline = 'top';
  sheet.lines.forEach((line, index) => {
    context.fillText(line, -sheetWidth / 2 + 18 + Math.sin(index * 0.65 + time + sheet.seed) * 1.2, -sheetHeight / 2 + 20 + index * lineHeight);
  });

  context.restore();
}

function drawGallerySpotlight(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const x = width * 0.5;
  const y = height * 0.48;
  const pulse = Math.sin(time * 2.4) * 0.5 + 0.5;

  context.save();
  const glow = context.createRadialGradient(x, y, 0, x, y, Math.min(width, height) * 0.5);
  glow.addColorStop(0, `rgba(255, 238, 191, ${0.38 + pulse * 0.16})`);
  glow.addColorStop(1, 'rgba(255, 238, 191, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(255, 248, 232, 0.62)';
  context.lineWidth = 3;
  context.strokeRect(x - Math.min(width * 0.22, 210), y - Math.min(height * 0.2, 130), Math.min(width * 0.44, 420), Math.min(height * 0.4, 260));
  if (label) {
    context.fillStyle = 'rgba(255, 248, 232, 0.82)';
    context.font = '750 16px Outfit, sans-serif';
    context.textAlign = 'center';
    context.fillText(label, x, y - Math.min(height * 0.24, 158));
  }
  context.restore();
}

function createDrawingsScene(): SceneRuntime {
  const entries = Object.entries(drawingModules);
  let width = 1;
  let height = 1;
  let sheets: DrawingSheet[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      sheets = entries.map(([path, content], index) => sheets[index] ?? createSheet(path, content, index, width, height));
    },
    render({ context, time, delta, pointer, specialEvent }) {
      clearLinear(context, width, height, ['#496c78', '#d4b28d']);
      if (specialEvent.active) drawGallerySpotlight(context, time, width, height, specialEvent.label);

      for (const [index, sheet] of sheets.entries()) {
        const pointerX = pointer.x * width;
        const pointerY = pointer.y * height;
        const distance = Math.hypot(sheet.x - pointerX, sheet.y - pointerY);
        const influence = pointer.active ? Math.max(0, 1 - distance / 340) : 0;

        sheet.vx += pointer.dx * width * influence * 5 * delta;
        sheet.vy += pointer.dy * height * influence * 4 * delta;
        sheet.spin += (pointer.dx * 7 - pointer.dy * 4) * influence * delta;
        sheet.fold += (pointer.dx + pointer.dy) * influence * 2.5 * delta;

        if (specialEvent.active) {
          const column = (index % 3) - 1;
          const row = Math.floor(index / 3) % 2 === 0 ? -1 : 1;
          const targetX = width * 0.5 + column * Math.min(width * 0.16, 150);
          const targetY = height * 0.48 + row * Math.min(height * 0.13, 78);
          sheet.vx += (targetX - sheet.x) * delta * 1.3;
          sheet.vy += (targetY - sheet.y) * delta * 1.3;
          sheet.angle += (column * 0.08 - sheet.angle) * delta * 0.8;
          sheet.fold += Math.sin(time * 3 + sheet.seed) * delta * 0.7;
        }

        sheet.x += sheet.vx * delta;
        sheet.y += sheet.vy * delta + Math.sin(time * 0.9 + sheet.seed) * 0.18;
        sheet.angle += sheet.spin * delta + Math.sin(time * 0.7 + sheet.seed) * 0.0009;
        sheet.vx *= 0.998;
        sheet.vy *= 0.994;
        sheet.spin *= 0.995;
        sheet.fold *= 0.988;

        sheet.x = wrap(sheet.x, -280, width + 280);
        sheet.y = wrap(sheet.y, -160, height + 160);
        drawSheet(context, sheet, time);
      }
    },
  };
}

export const drawingsScene: SceneDefinition = {
  id: 'drawings',
  title: 'Dibujos',
  description: 'Dibujos ASCII volando como hojas atravesando la pantalla.',
  Icon: GalleryHorizontalEnd,
  create: createDrawingsScene,
};