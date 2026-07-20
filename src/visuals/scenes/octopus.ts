import { Shell } from 'lucide-react';
import type { PointerPosition, SceneDefinition, SceneRuntime } from '../types';
import { angleLerp, clearRadial, clamp, createParticles, lerp, randomRange, TAU, wrap } from '../utils/canvas';

type Octopus = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  pulse: number;
  pulseSpeed: number;
  turnSpeed: number;
  color: string;
  seed: number;
};

function createOctopus(width: number, height: number, seed: number): Octopus {
  const angle = randomRange(0, TAU);
  return {
    x: randomRange(-80, width + 80),
    y: randomRange(-60, height + 60),
    vx: Math.cos(angle) * randomRange(6, 22),
    vy: Math.sin(angle) * randomRange(6, 22),
    angle,
    size: randomRange(26, 46),
    pulse: randomRange(0, TAU),
    pulseSpeed: randomRange(2.4, 3.7),
    turnSpeed: randomRange(1.4, 2.2),
    color: seed % 2 === 0 ? '#f08a9d' : '#e98fbf',
    seed,
  };
}

function drawOctopus(context: CanvasRenderingContext2D, octopus: Octopus, time: number) {
  const contraction = Math.max(0, Math.sin(octopus.pulse));
  const mantleWidth = octopus.size * lerp(0.78, 0.96, contraction);
  const mantleLength = octopus.size * lerp(1.12, 0.92, contraction);
  const speed = Math.hypot(octopus.vx, octopus.vy);

  context.save();
  context.translate(octopus.x, octopus.y);
  context.rotate(octopus.angle + Math.PI / 2);

  context.lineCap = 'round';
  for (let tentacle = -3; tentacle <= 3; tentacle += 1) {
    const baseX = tentacle * octopus.size * 0.13;
    const sway = Math.sin(time * 5 + tentacle + octopus.seed) * octopus.size * 0.18;
    const extension = lerp(0.92, 1.18, contraction) * octopus.size;
    context.beginPath();
    context.moveTo(baseX, octopus.size * 0.42);
    context.bezierCurveTo(
      baseX + sway * 0.5,
      octopus.size * 0.72,
      baseX - sway,
      extension,
      baseX + tentacle * octopus.size * 0.08,
      extension + speed * 0.22,
    );
    context.lineWidth = octopus.size * (tentacle === 0 ? 0.08 : 0.055);
    context.strokeStyle = `rgba(240, 138, 157, ${tentacle === 0 ? 0.76 : 0.58})`;
    context.stroke();
  }

  const bodyGradient = context.createRadialGradient(0, -mantleLength * 0.18, 0, 0, -mantleLength * 0.18, mantleLength);
  bodyGradient.addColorStop(0, 'rgba(255, 216, 225, 0.96)');
  bodyGradient.addColorStop(0.48, octopus.color);
  bodyGradient.addColorStop(1, 'rgba(144, 61, 104, 0.62)');
  context.fillStyle = bodyGradient;
  context.beginPath();
  context.ellipse(0, -octopus.size * 0.15, mantleWidth, mantleLength, 0, 0, TAU);
  context.fill();

  context.fillStyle = 'rgba(255, 245, 250, 0.68)';
  context.beginPath();
  context.ellipse(-octopus.size * 0.24, -octopus.size * 0.42, octopus.size * 0.12, octopus.size * 0.18, -0.25, 0, TAU);
  context.ellipse(octopus.size * 0.24, -octopus.size * 0.42, octopus.size * 0.12, octopus.size * 0.18, 0.25, 0, TAU);
  context.fill();

  context.fillStyle = '#10293f';
  context.beginPath();
  context.arc(-octopus.size * 0.24, -octopus.size * 0.43, octopus.size * 0.045, 0, TAU);
  context.arc(octopus.size * 0.24, -octopus.size * 0.43, octopus.size * 0.045, 0, TAU);
  context.fill();
  context.restore();
}

function updateOctopus(octopus: Octopus, delta: number, time: number, width: number, height: number, pointer: PointerPosition) {
  const pointerX = pointer.x * width;
  const pointerY = pointer.y * height;
  const pointerDistance = Math.hypot(pointerX - octopus.x, pointerY - octopus.y);
  const wanderAngle = Math.sin(time * 0.42 + octopus.seed) * 0.85 + Math.cos(time * 0.21 + octopus.seed) * 0.45;
  let targetAngle = octopus.angle + wanderAngle * delta;

  if (pointer.active && pointerDistance < 360) {
    targetAngle = Math.atan2(pointerY - octopus.y, pointerX - octopus.x);
  } else if (octopus.x < 80 || octopus.x > width - 80 || octopus.y < 80 || octopus.y > height - 80) {
    targetAngle = Math.atan2(height * 0.5 - octopus.y, width * 0.5 - octopus.x);
  }

  octopus.angle = angleLerp(octopus.angle, targetAngle, clamp(delta * octopus.turnSpeed, 0, 0.08));
  octopus.pulse = wrap(octopus.pulse + delta * octopus.pulseSpeed, 0, TAU);

  const contraction = Math.max(0, Math.sin(octopus.pulse));
  const thrust = contraction * contraction * 62 * delta;
  octopus.vx += Math.cos(octopus.angle) * thrust;
  octopus.vy += Math.sin(octopus.angle) * thrust;

  const currentX = Math.sin(time * 0.18 + octopus.seed) * 4 * delta;
  const currentY = Math.cos(time * 0.16 + octopus.seed) * 3 * delta;
  octopus.vx += currentX;
  octopus.vy += currentY;

  const speed = Math.hypot(octopus.vx, octopus.vy);
  const maxSpeed = 86;
  if (speed > maxSpeed) {
    octopus.vx = (octopus.vx / speed) * maxSpeed;
    octopus.vy = (octopus.vy / speed) * maxSpeed;
  }

  octopus.vx *= 0.992;
  octopus.vy *= 0.992;
  octopus.x += octopus.vx * delta;
  octopus.y += octopus.vy * delta;

  const margin = octopus.size * 2.4;
  octopus.x = wrap(octopus.x, -margin, width + margin);
  octopus.y = wrap(octopus.y, -margin, height + margin);
}

function createOctopusScene(): SceneRuntime {
  const dusts = createParticles(110);
  let width = 1;
  let height = 1;
  let lightX = 0.5;
  let lightY = 0.45;
  let octopuses: Octopus[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const count = clamp(Math.round((width * height) / 90000), 5, 11);
      octopuses = Array.from({ length: count }, (_, index) => octopuses[index] ?? createOctopus(width, height, index + 1));
    },
    render({ context, time, delta, pointer }) {
      lightX = lerp(lightX, pointer.active ? pointer.x : 0.5, 0.045);
      lightY = lerp(lightY, pointer.active ? pointer.y : 0.42, 0.045);
      clearRadial(context, width, height, lightX * width, lightY * height, ['#2263a5', '#123f72', '#07192b']);

      for (const dust of dusts) {
        const x = dust.x * width + Math.sin(time * dust.speed + dust.seed) * 22 + (lightX - 0.5) * 28;
        const y = (dust.y * height + time * 12 * dust.speed) % height;
        const glow = 0.18 + 0.4 * Math.abs(Math.sin(time * dust.speed + dust.seed));
        context.fillStyle = `rgba(186, 221, 255, ${glow})`;
        context.beginPath();
        context.arc(x, y, dust.size * 1.25, 0, TAU);
        context.fill();
      }

      for (const octopus of octopuses) {
        updateOctopus(octopus, delta, time, width, height, pointer);
        drawOctopus(context, octopus, time);
      }
    },
  };
}

export const octopusScene: SceneDefinition = {
  id: 'octopus',
  title: 'Pulpos',
  description: 'Pulpos nadando con pulsos de propulsion y reaccionando al puntero.',
  Icon: Shell,
  create: createOctopusScene,
};