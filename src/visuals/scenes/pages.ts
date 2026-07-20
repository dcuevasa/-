import { BookOpen } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear, createParticles } from '../utils/canvas';

function drawPage(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = 'rgba(255, 248, 232, 0.9)';
  context.strokeStyle = 'rgba(89, 68, 55, 0.24)';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(-size * 0.45, -size * 0.62, size * 0.9, size * 1.24, 8);
  context.fill();
  context.stroke();
  context.strokeStyle = 'rgba(89, 68, 55, 0.35)';
  for (let line = 0; line < 5; line += 1) {
    context.beginPath();
    context.moveTo(-size * 0.28, -size * 0.32 + line * size * 0.17);
    context.lineTo(size * (line % 2 === 0 ? 0.24 : 0.08), -size * 0.32 + line * size * 0.17);
    context.stroke();
  }
  context.restore();
}

function createPagesScene(): SceneRuntime {
  const pages = createParticles(30);

  return {
    render({ context, time, width, height, pointer }) {
      clearLinear(context, width, height, ['#6d8a8c', '#d9b894']);
      for (const page of pages) {
        const x = ((page.x * width + time * 48 * page.speed) % (width + 120)) - 60;
        const y = page.y * height + Math.sin(time * 1.3 + page.seed) * 42 + (pointer.y - 0.5) * 38;
        drawPage(context, x, y, 28 + page.size * 8, Math.sin(time + page.seed) * 0.8);
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