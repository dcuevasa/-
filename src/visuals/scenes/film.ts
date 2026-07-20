import { Clapperboard } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear } from '../utils/canvas';

type FilmLane = {
  yRate: number;
  speed: number;
  offset: number;
  entangle: number;
};

function createFilmScene(): SceneRuntime {
  const lanes: FilmLane[] = [
    { yRate: 0.22, speed: 70, offset: 0, entangle: 0 },
    { yRate: 0.5, speed: 88, offset: -80, entangle: 0 },
    { yRate: 0.78, speed: 106, offset: -160, entangle: 0 },
  ];

  return {
    render({ context, time, delta, width, height, pointer }) {
      clearLinear(context, width, height, ['#261f2c', '#bb6f5a']);
      const stripHeight = Math.max(86, height * 0.18);
      const pointerX = pointer.x * width;
      const pointerY = pointer.y * height;
      const pointerSpeed = Math.hypot(pointer.dx * width, pointer.dy * height);

      for (const [laneIndex, lane] of lanes.entries()) {
        const y = height * lane.yRate;
        const nearLane = pointer.active && Math.abs(pointerY - y) < stripHeight * 0.8;
        lane.entangle += nearLane && pointerSpeed < 9 ? delta * 0.9 : -delta * 0.75;
        lane.entangle = Math.max(0, Math.min(1, lane.entangle));
        lane.offset += (lane.speed + pointer.dx * width * (nearLane ? 5 : 0)) * delta;
        const offset = (lane.offset % 180) - 180;
        context.save();
        context.translate(offset, y);
        context.rotate((laneIndex - 1) * 0.08 + lane.entangle * Math.sin(time * 3 + laneIndex) * 0.08);
        for (let x = -40; x < width + 260; x += 24) {
          const worldX = x + offset;
          const distance = pointer.active ? Math.abs(worldX - pointerX) : 9999;
          const pull = Math.max(0, 1 - distance / 220) * lane.entangle;
          const knot = Math.sin(time * 7 + x * 0.04 + laneIndex) * stripHeight * 0.34 * pull;
          const push = nearLane ? pointer.dy * height * Math.max(0, 1 - distance / 280) * 2.2 : 0;
          const localY = knot + push;
          context.fillStyle = 'rgba(23, 19, 24, 0.84)';
          context.fillRect(x, -stripHeight / 2 + localY, 26, stripHeight);
          context.fillStyle = 'rgba(255, 242, 196, 0.88)';
          context.fillRect(x + 5, -stripHeight / 2 + 10 + localY, 10, 10);
          context.fillRect(x + 5, stripHeight / 2 - 20 + localY, 10, 10);
          if (x % 72 === 0) {
            context.strokeStyle = 'rgba(255, 242, 196, 0.24)';
            context.strokeRect(x + 18, -stripHeight / 2 + 28 + localY, 46, stripHeight - 56);
          }
        }
        context.restore();
      }
    },
  };
}

export const filmScene: SceneDefinition = {
  id: 'film',
  title: 'Pelicula',
  description: 'Tiras de filme cruzando la pantalla como una proyeccion en movimiento.',
  Icon: Clapperboard,
  create: createFilmScene,
};