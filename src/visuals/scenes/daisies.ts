import { Flower2 } from 'lucide-react';
import type { PointerPosition } from '../types';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear, createParticles, randomRange, TAU, wrap } from '../utils/canvas';

type Daisy = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  seed: number;
};

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
  const seeds = createParticles(46);
  let width = 1;
  let height = 1;
  let daisies: Daisy[] = [];

  function resize(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;
    daisies = seeds.map((seed, index) => daisies[index] ?? {
      x: seed.x * width,
      y: seed.y * height,
      vx: randomRange(-6, 6),
      vy: randomRange(12, 32),
      angle: seed.seed,
      spin: randomRange(-1.2, 1.2),
      size: 10 + seed.size * 5,
      seed: seed.seed,
    });
  }

  function applyBreeze(daisy: Daisy, pointer: PointerPosition, delta: number) {
    if (!pointer.active) return;

    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const distance = Math.hypot(daisy.x - pointerX, daisy.y - pointerY);
    const influence = Math.max(0, 1 - distance / 280);
    const gustX = pointer.dx * width * 12;
    const gustY = pointer.dy * height * 12;
    daisy.vx += gustX * influence * delta;
    daisy.vy += gustY * influence * delta;
    daisy.spin += (pointer.dx * 18 + pointer.dy * 8) * influence * delta;
  }

  return {
    resize,
    render({ context, time, delta, width, height, pointer }) {
      clearLinear(context, width, height, ['#9fbf88', '#e5d29e']);
      for (const daisy of daisies) {
        applyBreeze(daisy, pointer, delta);
        daisy.vx += Math.sin(time * 0.9 + daisy.seed) * 0.018;
        daisy.vy += 0.018;
        daisy.x += daisy.vx * delta;
        daisy.y += daisy.vy * delta;
        daisy.angle += daisy.spin * delta;
        daisy.vx *= 0.995;
        daisy.vy *= 0.998;
        daisy.spin *= 0.996;

        if (daisy.y > height + 80) {
          daisy.y = -60;
          daisy.x = randomRange(0, width);
          daisy.vy = randomRange(16, 34);
        }

        daisy.x = wrap(daisy.x, -80, width + 80);
        drawDaisy(context, daisy.x, daisy.y, daisy.size, daisy.angle);
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