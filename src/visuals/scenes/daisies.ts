import { Flower2 } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear, createParticles, TAU } from '../utils/canvas';

function drawDaisy(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  for (let petal = 0; petal < 10; petal += 1) {
    context.rotate(TAU / 10);
    context.fillStyle = '#fff8df';
    context.beginPath();
    context.ellipse(0, -size * 0.55, size * 0.18, size * 0.42, 0, 0, TAU);
    context.fill();
  }
  context.fillStyle = '#f7bc45';
  context.beginPath();
  context.arc(0, 0, size * 0.24, 0, TAU);
  context.fill();
  context.restore();
}

function createDaisiesScene(): SceneRuntime {
  const daisies = createParticles(46);

  return {
    render({ context, time, width, height, pointer }) {
      clearLinear(context, width, height, ['#9fbf88', '#e5d29e']);
      for (const daisy of daisies) {
        const y = ((daisy.y * height + time * 42 * daisy.speed) % (height + 120)) - 80;
        const x = daisy.x * width + Math.sin(time * daisy.speed + daisy.seed) * 46 + (pointer.x - 0.5) * 44;
        drawDaisy(context, x, y, 10 + daisy.size * 5, time * daisy.speed + daisy.seed);
      }
    },
  };
}

export const daisiesScene: SceneDefinition = {
  id: 'daisies',
  title: 'Margaritas',
  description: 'Margaritas cayendo y girando lentamente en el viento.',
  Icon: Flower2,
  create: createDaisiesScene,
};