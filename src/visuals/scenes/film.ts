import { Clapperboard } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear } from '../utils/canvas';

function createFilmScene(): SceneRuntime {
  return {
    render({ context, time, width, height, pointer }) {
      clearLinear(context, width, height, ['#261f2c', '#bb6f5a']);
      const stripHeight = Math.max(86, height * 0.18);
      const lanes = [height * 0.22, height * 0.5, height * 0.78];

      for (const [laneIndex, y] of lanes.entries()) {
        const offset = ((time * (70 + laneIndex * 18)) % 180) - 180;
        context.save();
        context.translate(offset + (pointer.x - 0.5) * 42, y);
        context.rotate((laneIndex - 1) * 0.08);
        context.fillStyle = 'rgba(23, 19, 24, 0.82)';
        context.fillRect(0, -stripHeight / 2, width + 260, stripHeight);
        context.fillStyle = 'rgba(255, 242, 196, 0.88)';
        for (let x = 14; x < width + 260; x += 34) {
          context.fillRect(x, -stripHeight / 2 + 10, 15, 12);
          context.fillRect(x, stripHeight / 2 - 22, 15, 12);
        }
        context.strokeStyle = 'rgba(255, 242, 196, 0.24)';
        for (let x = 58; x < width + 260; x += 82) {
          context.strokeRect(x, -stripHeight / 2 + 28, 56, stripHeight - 56);
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