import { Clapperboard } from 'lucide-react';
import type { SceneDefinition, SceneRuntime } from '../types';
import { clearLinear } from '../utils/canvas';

type FilmLane = {
  yRate: number;
  speed: number;
  offset: number;
  entangle: number;
};

function drawProjector(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const projectorX = width * 0.12;
  const projectorY = height * 0.18;
  const pulse = Math.sin(time * 8) * 0.5 + 0.5;

  context.save();
  const beam = context.createLinearGradient(projectorX, projectorY, width * 0.72, height * 0.48);
  beam.addColorStop(0, `rgba(255, 242, 196, ${0.32 + pulse * 0.12})`);
  beam.addColorStop(1, 'rgba(255, 242, 196, 0)');
  context.fillStyle = beam;
  context.beginPath();
  context.moveTo(projectorX + 42, projectorY - 18);
  context.lineTo(width * 0.86, height * 0.28);
  context.lineTo(width * 0.86, height * 0.72);
  context.lineTo(projectorX + 42, projectorY + 18);
  context.closePath();
  context.fill();

  context.fillStyle = '#201a22';
  context.strokeStyle = '#fff2c4';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(projectorX - 22, projectorY - 18, 58, 36, 8);
  context.fill();
  context.stroke();
  for (const reelX of [projectorX - 8, projectorX + 24]) {
    context.beginPath();
    context.arc(reelX, projectorY - 34, 16, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.fillStyle = '#fff2c4';
  context.font = `750 ${Math.min(width * 0.08, height * 0.1, 72)}px Fraunces, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label ?? '11:11', width * 0.72, height * 0.48);
  context.restore();
}

function createFilmScene(): SceneRuntime {
  const lanes: FilmLane[] = [
    { yRate: 0.22, speed: 70, offset: 0, entangle: 0 },
    { yRate: 0.5, speed: 88, offset: -80, entangle: 0 },
    { yRate: 0.78, speed: 106, offset: -160, entangle: 0 },
  ];

  return {
    render({ context, time, delta, width, height, pointer, specialEvent }) {
      clearLinear(context, width, height, ['#261f2c', '#bb6f5a']);
      if (specialEvent.active) drawProjector(context, time, width, height, specialEvent.label);
      const stripHeight = Math.max(86, height * 0.18);
      const pointerX = pointer.x * width;
      const pointerY = pointer.y * height;
      const pointerSpeed = Math.hypot(pointer.dx * width, pointer.dy * height);

      for (const [laneIndex, lane] of lanes.entries()) {
        const y = height * lane.yRate;
        const nearLane = pointer.active && Math.abs(pointerY - y) < stripHeight * 0.8;
        lane.entangle += specialEvent.active || (nearLane && pointerSpeed < 9) ? delta * 0.9 : -delta * 0.75;
        lane.entangle = Math.max(0, Math.min(1, lane.entangle));
        lane.offset += (lane.speed * (specialEvent.active ? 1.8 : 1) + pointer.dx * width * (nearLane ? 5 : 0)) * delta;
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