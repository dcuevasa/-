import { BookOpen } from 'lucide-react';
import type { PointerPosition, SceneDefinition, SceneRuntime } from '../types';
import { clearLinear, createParticles, randomRange, TAU, wrap } from '../utils/canvas';

type Page = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  fold: number;
  seed: number;
};

function drawPage(context: CanvasRenderingContext2D, page: Page, time: number) {
  const fold = Math.sin(time * 2.4 + page.seed) * 0.5 + page.fold;
  const curl = Math.max(-0.7, Math.min(0.7, fold));
  const width = page.size * 0.9;
  const height = page.size * 1.24;

  context.save();
  context.translate(page.x, page.y);
  context.rotate(page.angle);
  context.fillStyle = 'rgba(255, 248, 232, 0.9)';
  context.strokeStyle = 'rgba(89, 68, 55, 0.24)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-width * 0.5, -height * 0.5);
  context.bezierCurveTo(-width * 0.1, -height * 0.6 + curl * 18, width * 0.1, -height * 0.38 - curl * 16, width * 0.5, -height * 0.5 + curl * 8);
  context.bezierCurveTo(width * 0.44 + curl * 18, -height * 0.12, width * 0.42 - curl * 18, height * 0.24, width * 0.5, height * 0.5);
  context.bezierCurveTo(width * 0.1, height * 0.62 - curl * 14, -width * 0.16, height * 0.4 + curl * 16, -width * 0.5, height * 0.5);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = `rgba(240, 223, 192, ${0.22 + Math.abs(curl) * 0.18})`;
  context.beginPath();
  context.moveTo(width * 0.18, -height * 0.48 + curl * 10);
  context.bezierCurveTo(width * 0.45 + curl * 16, -height * 0.2, width * 0.35 - curl * 10, height * 0.22, width * 0.18, height * 0.48);
  context.lineTo(width * 0.5, height * 0.5);
  context.bezierCurveTo(width * 0.42 - curl * 18, height * 0.18, width * 0.45 + curl * 18, -height * 0.12, width * 0.5, -height * 0.5 + curl * 8);
  context.closePath();
  context.fill();

  context.strokeStyle = 'rgba(89, 68, 55, 0.35)';
  for (let line = 0; line < 5; line += 1) {
    const y = -height * 0.26 + line * page.size * 0.17;
    context.beginPath();
    context.moveTo(-page.size * 0.28, y);
    context.quadraticCurveTo(curl * 10, y + curl * 6, page.size * (line % 2 === 0 ? 0.24 : 0.08), y + curl * 2);
    context.stroke();
  }
  context.restore();
}

function drawOpenBook(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const x = width * 0.5;
  const y = height * 0.56;
  const bookWidth = Math.min(width * 0.46, 360);
  const bookHeight = Math.min(height * 0.22, 140);
  const pulse = Math.sin(time * 2.6) * 0.5 + 0.5;

  context.save();
  const glow = context.createRadialGradient(x, y - bookHeight * 0.2, 0, x, y - bookHeight * 0.2, bookWidth * 0.86);
  glow.addColorStop(0, `rgba(255, 237, 179, ${0.32 + pulse * 0.18})`);
  glow.addColorStop(1, 'rgba(255, 237, 179, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255, 248, 232, 0.94)';
  context.strokeStyle = 'rgba(89, 68, 55, 0.42)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y - bookHeight * 0.42);
  context.bezierCurveTo(x - bookWidth * 0.18, y - bookHeight * 0.62, x - bookWidth * 0.42, y - bookHeight * 0.48, x - bookWidth * 0.48, y + bookHeight * 0.35);
  context.bezierCurveTo(x - bookWidth * 0.2, y + bookHeight * 0.18, x - bookWidth * 0.08, y + bookHeight * 0.28, x, y + bookHeight * 0.42);
  context.bezierCurveTo(x + bookWidth * 0.08, y + bookHeight * 0.28, x + bookWidth * 0.2, y + bookHeight * 0.18, x + bookWidth * 0.48, y + bookHeight * 0.35);
  context.bezierCurveTo(x + bookWidth * 0.42, y - bookHeight * 0.48, x + bookWidth * 0.18, y - bookHeight * 0.62, x, y - bookHeight * 0.42);
  context.fill();
  context.stroke();

  context.strokeStyle = 'rgba(118, 87, 62, 0.24)';
  for (let line = 0; line < 5; line += 1) {
    context.beginPath();
    context.moveTo(x - bookWidth * 0.36, y - bookHeight * 0.23 + line * 18);
    context.quadraticCurveTo(x - bookWidth * 0.18, y - bookHeight * 0.3 + line * 15, x - bookWidth * 0.04, y - bookHeight * 0.1 + line * 12);
    context.moveTo(x + bookWidth * 0.36, y - bookHeight * 0.23 + line * 18);
    context.quadraticCurveTo(x + bookWidth * 0.18, y - bookHeight * 0.3 + line * 15, x + bookWidth * 0.04, y - bookHeight * 0.1 + line * 12);
    context.stroke();
  }

  if (label) {
    context.fillStyle = 'rgba(255, 248, 232, 0.78)';
    context.font = '750 18px Outfit, sans-serif';
    context.textAlign = 'center';
    context.fillText(label, x, y - bookHeight * 0.72);
  }
  context.restore();
}

function createPagesScene(): SceneRuntime {
  const seeds = createParticles(30);
  let width = 1;
  let height = 1;
  let pages: Page[] = [];

  function resize(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;
    pages = seeds.map((seed, index) => pages[index] ?? {
      x: seed.x * width,
      y: seed.y * height,
      vx: randomRange(20, 54),
      vy: randomRange(-10, 18),
      angle: randomRange(-0.6, 0.6),
      spin: randomRange(-0.9, 0.9),
      size: 28 + seed.size * 8,
      fold: randomRange(-0.2, 0.2),
      seed: seed.seed,
    });
  }

  function applyWind(page: Page, pointer: PointerPosition, delta: number) {
    if (!pointer.active) return;

    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const distance = Math.hypot(page.x - pointerX, page.y - pointerY);
    const influence = Math.max(0, 1 - distance / 360);
    page.vx += pointer.dx * width * 18 * influence * delta;
    page.vy += pointer.dy * height * 15 * influence * delta;
    page.spin += (pointer.dx * 26 - pointer.dy * 12) * influence * delta;
    page.fold += (pointer.dx * 5 + pointer.dy * 4) * influence * delta;
  }

  return {
    resize,
    render({ context, time, delta, width, height, pointer, specialEvent }) {
      clearLinear(context, width, height, ['#6d8a8c', '#d9b894']);
      if (specialEvent.active) drawOpenBook(context, time, width, height, specialEvent.label);
      for (const [index, page] of pages.entries()) {
        applyWind(page, pointer, delta);
        if (specialEvent.active) {
          const angle = (index / pages.length) * TAU + time * 0.95;
          const radius = Math.min(width, height) * 0.24;
          const targetX = width * 0.5 + Math.cos(angle) * radius;
          const targetY = height * 0.44 + Math.sin(angle) * radius * 0.55;
          page.vx += (targetX - page.x) * delta * 1.25;
          page.vy += (targetY - page.y) * delta * 1.25;
          page.spin += delta * 2.2;
          page.fold += Math.sin(time * 4 + index) * delta;
        }
        page.vx += Math.sin(time * 0.6 + page.seed) * 0.05;
        page.vy += Math.cos(time * 0.5 + page.seed) * 0.04;
        page.x += page.vx * delta;
        page.y += page.vy * delta;
        page.angle += page.spin * delta;
        page.fold *= 0.985;
        page.spin *= 0.992;
        page.vx *= 0.998;
        page.vy *= 0.997;
        page.x = wrap(page.x, -90, width + 90);
        page.y = wrap(page.y, -90, height + 90);
        drawPage(context, page, time);
      }
    },
  };
}

export const pagesScene: SceneDefinition = {
  id: 'pages',
  title: 'Paginas',
  description: 'Paginas de libros viajando como hojas sueltas.',
  Icon: BookOpen,
  create: createPagesScene,
};