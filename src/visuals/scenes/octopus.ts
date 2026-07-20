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
  inkCooldown: number;
  startled: number;
};

type InkDrop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
};

const octopusColors = ['#f06f8f', '#ec6fbd', '#f28b6c', '#d87edb'] as const;

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
    color: octopusColors[seed % octopusColors.length],
    seed,
    inkCooldown: 0,
    startled: 0,
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
    context.lineWidth = octopus.size * (tentacle === 0 ? 0.1 : 0.07);
    context.strokeStyle = octopus.color;
    context.stroke();
  }

  context.fillStyle = octopus.color;
  context.beginPath();
  context.ellipse(0, -octopus.size * 0.15, mantleWidth, mantleLength, 0, 0, TAU);
  context.fill();

  context.fillStyle = '#ffd6df';
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

function splashInk(inkDrops: InkDrop[], octopus: Octopus, awayAngle: number) {
  for (let index = 0; index < 18; index += 1) {
    const angle = awayAngle + Math.PI + randomRange(-0.85, 0.85);
    const speed = randomRange(70, 220);
    inkDrops.push({
      x: octopus.x - Math.cos(octopus.angle) * octopus.size * 0.6,
      y: octopus.y - Math.sin(octopus.angle) * octopus.size * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomRange(8, 26),
      life: randomRange(0.55, 1.15),
    });
  }
}

function updateOctopus(
  octopus: Octopus,
  inkDrops: InkDrop[],
  delta: number,
  time: number,
  width: number,
  height: number,
  pointer: PointerPosition,
) {
  const pointerX = pointer.x * width;
  const pointerY = pointer.y * height;
  const pointerDistance = Math.hypot(pointerX - octopus.x, pointerY - octopus.y);
  const wanderAngle = Math.sin(time * 0.42 + octopus.seed) * 0.85 + Math.cos(time * 0.21 + octopus.seed) * 0.45;
  let targetAngle = octopus.angle + wanderAngle * delta;

  octopus.inkCooldown = Math.max(0, octopus.inkCooldown - delta);
  octopus.startled = Math.max(0, octopus.startled - delta * 1.8);

  if (pointer.active && pointerDistance < 320) {
    targetAngle = Math.atan2(octopus.y - pointerY, octopus.x - pointerX);
    const repulsion = ((320 - pointerDistance) / 320) * 110 * delta;
    octopus.vx += Math.cos(targetAngle) * repulsion;
    octopus.vy += Math.sin(targetAngle) * repulsion;

    if (pointerDistance < octopus.size * 1.45 && octopus.inkCooldown === 0) {
      octopus.color = octopusColors[Math.floor(randomRange(0, octopusColors.length))];
      octopus.vx += Math.cos(targetAngle) * 245;
      octopus.vy += Math.sin(targetAngle) * 245;
      octopus.pulse = Math.PI / 2;
      octopus.inkCooldown = 0.65;
      octopus.startled = 1;
      splashInk(inkDrops, octopus, targetAngle);
    }
  } else if (octopus.x < 80 || octopus.x > width - 80 || octopus.y < 80 || octopus.y > height - 80) {
    targetAngle = Math.atan2(height * 0.5 - octopus.y, width * 0.5 - octopus.x);
  }

  octopus.angle = angleLerp(octopus.angle, targetAngle, clamp(delta * (octopus.turnSpeed + octopus.startled * 4), 0, 0.16));
  octopus.pulse = wrap(octopus.pulse + delta * octopus.pulseSpeed * (1 + octopus.startled * 1.8), 0, TAU);

  const contraction = Math.max(0, Math.sin(octopus.pulse));
  const thrust = contraction * contraction * (62 + octopus.startled * 140) * delta;
  octopus.vx += Math.cos(octopus.angle) * thrust;
  octopus.vy += Math.sin(octopus.angle) * thrust;

  const currentX = Math.sin(time * 0.18 + octopus.seed) * 4 * delta;
  const currentY = Math.cos(time * 0.16 + octopus.seed) * 3 * delta;
  octopus.vx += currentX;
  octopus.vy += currentY;

  const speed = Math.hypot(octopus.vx, octopus.vy);
  const maxSpeed = 92 + octopus.startled * 190;
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

function renderInk(context: CanvasRenderingContext2D, inkDrops: InkDrop[], delta: number) {
  for (let index = inkDrops.length - 1; index >= 0; index -= 1) {
    const drop = inkDrops[index];
    drop.life -= delta;
    drop.x += drop.vx * delta;
    drop.y += drop.vy * delta;
    drop.vx *= 0.982;
    drop.vy *= 0.982;
    drop.radius += 18 * delta;

    if (drop.life <= 0) {
      inkDrops.splice(index, 1);
      continue;
    }

    const gradient = context.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.radius);
    gradient.addColorStop(0, `rgba(23, 13, 46, ${0.52 * drop.life})`);
    gradient.addColorStop(0.45, `rgba(34, 19, 70, ${0.28 * drop.life})`);
    gradient.addColorStop(1, 'rgba(34, 19, 70, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(drop.x, drop.y, drop.radius, 0, TAU);
    context.fill();
  }
}

function drawTideMoon(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const moonX = width * 0.5 + Math.sin(time * 0.45) * width * 0.12;
  const moonY = height * 0.2;
  const pulse = Math.sin(time * 2.2) * 0.5 + 0.5;

  context.save();
  const glow = context.createRadialGradient(moonX, moonY, 0, moonX, moonY, Math.min(width, height) * 0.42);
  glow.addColorStop(0, `rgba(223, 245, 255, ${0.38 + pulse * 0.18})`);
  glow.addColorStop(1, 'rgba(223, 245, 255, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#eaf8ff';
  context.beginPath();
  context.arc(moonX, moonY, 34 + pulse * 5, 0, TAU);
  context.fill();
  context.fillStyle = '#123f72';
  context.beginPath();
  context.arc(moonX + 15, moonY - 5, 31, 0, TAU);
  context.fill();

  context.strokeStyle = 'rgba(205, 240, 255, 0.46)';
  context.lineWidth = 2;
  for (let wave = 0; wave < 5; wave += 1) {
    const y = height * (0.42 + wave * 0.09) + Math.sin(time * 1.5 + wave) * 8;
    context.beginPath();
    for (let x = -40; x <= width + 40; x += 38) {
      const waveY = y + Math.sin(time * 2 + x * 0.018 + wave) * 12;
      if (x === -40) context.moveTo(x, waveY);
      else context.lineTo(x, waveY);
    }
    context.stroke();
  }

  if (label) {
    context.fillStyle = 'rgba(234, 248, 255, 0.8)';
    context.font = '700 14px Outfit, sans-serif';
    context.textAlign = 'center';
    context.fillText(label, moonX, moonY + 58);
  }
  context.restore();
}

function createOctopusScene(): SceneRuntime {
  const dusts = createParticles(110);
  let width = 1;
  let height = 1;
  let lightX = 0.5;
  let lightY = 0.45;
  let octopuses: Octopus[] = [];
  const inkDrops: InkDrop[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const count = clamp(Math.round((width * height) / 180000), 3, 5);
      octopuses = Array.from({ length: count }, (_, index) => octopuses[index] ?? createOctopus(width, height, index + 1));
    },
    render({ context, time, delta, pointer, specialEvent }) {
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

      if (specialEvent.active) drawTideMoon(context, time, width, height, specialEvent.label);

      renderInk(context, inkDrops, delta);

      for (const octopus of octopuses) {
        if (specialEvent.active) {
          const tideAngle = Math.atan2(octopus.y - height * 0.3, octopus.x - width * 0.5) + Math.PI / 2;
          octopus.vx += Math.cos(tideAngle) * 38 * delta;
          octopus.vy += Math.sin(tideAngle) * 38 * delta - 14 * delta;
          octopus.startled = Math.max(octopus.startled, 0.35);
        }
        updateOctopus(octopus, inkDrops, delta, time, width, height, pointer);
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