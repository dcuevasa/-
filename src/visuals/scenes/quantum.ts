import { Atom } from 'lucide-react';
import type { PointerPosition, SceneDefinition, SceneRuntime } from '../types';
import { clamp, lerp, randomRange, TAU, wrap } from '../utils/canvas';

type Qubit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  radius: number;
  energy: number;
  collapsed: number;
  measuredState: 0 | 1;
  pair: number;
};

type MeasurementRipple = {
  x: number;
  y: number;
  radius: number;
  life: number;
};

function createQubit(index: number, width: number, height: number, total: number): Qubit {
  const ring = Math.min(width, height) * randomRange(0.18, 0.42);
  const angle = (index / total) * TAU + randomRange(-0.28, 0.28);
  return {
    x: width * 0.5 + Math.cos(angle) * ring,
    y: height * 0.5 + Math.sin(angle) * ring,
    vx: randomRange(-9, 9),
    vy: randomRange(-9, 9),
    phase: randomRange(0, TAU),
    phaseSpeed: randomRange(0.75, 1.85),
    radius: randomRange(12, 20),
    energy: randomRange(0.15, 0.65),
    collapsed: 0,
    measuredState: index % 2 === 0 ? 0 : 1,
    pair: (index + Math.floor(total / 2)) % total,
  };
}

function drawBackground(context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) {
  const focusX = (pointer.active ? pointer.x : 0.52 + Math.sin(time * 0.18) * 0.08) * width;
  const focusY = (pointer.active ? pointer.y : 0.46 + Math.cos(time * 0.16) * 0.08) * height;
  const gradient = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, Math.hypot(width, height) * 0.85);
  gradient.addColorStop(0, '#2e8690');
  gradient.addColorStop(0.32, '#173c52');
  gradient.addColorStop(1, '#080c1d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(179, 244, 238, 0.1)';
  context.lineWidth = 1;
  for (let x = ((time * 18) % 52) - 52; x < width + 52; x += 52) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + height * 0.18, height);
    context.stroke();
  }
}

function measureQubit(qubit: Qubit, ripples: MeasurementRipple[], pointerX: number, pointerY: number) {
  if (qubit.collapsed > 0.2) return;

  qubit.collapsed = 1;
  qubit.energy = 1;
  qubit.measuredState = Math.sin(qubit.phase) > 0 ? 1 : 0;
  qubit.vx += (qubit.x - pointerX) * 0.75;
  qubit.vy += (qubit.y - pointerY) * 0.75;
  ripples.push({ x: qubit.x, y: qubit.y, radius: 8, life: 1 });
}

function updateQubit(
  qubit: Qubit,
  qubits: Qubit[],
  ripples: MeasurementRipple[],
  pointer: PointerPosition,
  delta: number,
  time: number,
  width: number,
  height: number,
) {
  const centerPull = 0.18 * delta;
  qubit.vx += (width * 0.5 - qubit.x) * centerPull;
  qubit.vy += (height * 0.5 - qubit.y) * centerPull;
  qubit.vx += Math.sin(time * 0.7 + qubit.phase) * 4 * delta;
  qubit.vy += Math.cos(time * 0.6 + qubit.phase) * 4 * delta;

  if (pointer.active) {
    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const distance = Math.hypot(qubit.x - pointerX, qubit.y - pointerY);
    const influence = Math.max(0, 1 - distance / 230);
    const orbitAngle = Math.atan2(qubit.y - pointerY, qubit.x - pointerX) + Math.PI / 2;
    qubit.vx += Math.cos(orbitAngle) * influence * 95 * delta + pointer.dx * width * influence * 4;
    qubit.vy += Math.sin(orbitAngle) * influence * 95 * delta + pointer.dy * height * influence * 4;
    qubit.energy = clamp(qubit.energy + influence * delta * 1.8, 0, 1);

    if (distance < qubit.radius * 2.2) {
      measureQubit(qubit, ripples, pointerX, pointerY);
      const pair = qubits[qubit.pair];
      if (pair) {
        pair.collapsed = 1;
        pair.measuredState = qubit.measuredState === 1 ? 0 : 1;
        pair.energy = 1;
        ripples.push({ x: pair.x, y: pair.y, radius: 8, life: 0.85 });
      }
    }
  }

  qubit.phase = wrap(qubit.phase + qubit.phaseSpeed * delta * (1 + qubit.energy), 0, TAU);
  qubit.collapsed = Math.max(0, qubit.collapsed - delta * 0.45);
  qubit.energy = lerp(qubit.energy, 0.22, delta * 0.7);
  qubit.vx *= 0.985;
  qubit.vy *= 0.985;
  qubit.x = wrap(qubit.x + qubit.vx * delta, -60, width + 60);
  qubit.y = wrap(qubit.y + qubit.vy * delta, -60, height + 60);
}

function drawEntanglement(context: CanvasRenderingContext2D, qubits: Qubit[], time: number) {
  for (const qubit of qubits) {
    const pair = qubits[qubit.pair];
    if (!pair || qubit.pair < qubits.indexOf(qubit)) continue;

    const pulse = 0.18 + 0.36 * Math.abs(Math.sin(time * 2.1 + qubit.phase));
    context.strokeStyle = `rgba(127, 236, 224, ${pulse * (0.35 + qubit.energy * 0.65)})`;
    context.lineWidth = 1 + qubit.energy * 2;
    context.beginPath();
    context.moveTo(qubit.x, qubit.y);
    context.bezierCurveTo(
      (qubit.x + pair.x) * 0.5 + Math.sin(time + qubit.phase) * 38,
      (qubit.y + pair.y) * 0.5 + Math.cos(time + pair.phase) * 38,
      (qubit.x + pair.x) * 0.5 - Math.cos(time + pair.phase) * 32,
      (qubit.y + pair.y) * 0.5 - Math.sin(time + qubit.phase) * 32,
      pair.x,
      pair.y,
    );
    context.stroke();
  }
}

function drawQubit(context: CanvasRenderingContext2D, qubit: Qubit, time: number) {
  const superposition = Math.sin(qubit.phase) * 0.5 + 0.5;
  const color = qubit.measuredState === 1 ? '#f4cf6a' : '#8ae7dd';

  context.save();
  context.translate(qubit.x, qubit.y);
  context.rotate(qubit.phase * 0.35);

  context.strokeStyle = `rgba(201, 255, 248, ${0.3 + qubit.energy * 0.45})`;
  context.lineWidth = 1.4;
  for (let orbit = 0; orbit < 3; orbit += 1) {
    context.save();
    context.rotate((orbit * TAU) / 3 + time * 0.25);
    context.beginPath();
    context.ellipse(0, 0, qubit.radius * (2.2 + orbit * 0.18), qubit.radius * 0.72, 0, 0, TAU);
    context.stroke();
    context.restore();
  }

  context.fillStyle = color;
  context.beginPath();
  context.arc(0, 0, qubit.radius * (0.62 + superposition * 0.24 + qubit.collapsed * 0.34), 0, TAU);
  context.fill();

  context.fillStyle = qubit.measuredState === 1 ? '#2f260c' : '#083033';
  context.font = `${Math.max(11, qubit.radius * 0.8)}px "Outfit", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(qubit.measuredState), 0, 0.5);
  context.restore();
}

function drawRipples(context: CanvasRenderingContext2D, ripples: MeasurementRipple[], delta: number) {
  for (let index = ripples.length - 1; index >= 0; index -= 1) {
    const ripple = ripples[index];
    ripple.life -= delta;
    ripple.radius += 180 * delta;

    if (ripple.life <= 0) {
      ripples.splice(index, 1);
      continue;
    }

    context.strokeStyle = `rgba(244, 207, 106, ${0.45 * ripple.life})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(ripple.x, ripple.y, ripple.radius, 0, TAU);
    context.stroke();
  }
}

function drawQuantumGate(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const pulse = Math.sin(time * 3) * 0.5 + 0.5;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * (0.18 + pulse * 0.025);

  context.save();
  context.strokeStyle = `rgba(244, 207, 106, ${0.48 + pulse * 0.3})`;
  context.lineWidth = 2.4;
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.arc(centerX, centerY, radius + ring * 24 + pulse * 10, 0, TAU);
    context.stroke();
  }

  context.fillStyle = 'rgba(244, 207, 106, 0.12)';
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.7, 0, TAU);
  context.fill();
  context.fillStyle = '#f4cf6a';
  context.font = `750 ${Math.min(width * 0.09, height * 0.11, 70)}px Fraunces, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label ?? '11:11', centerX, centerY);
  context.restore();
}

function drawMusicVisualizer(context: CanvasRenderingContext2D, qubits: Qubit[], time: number, width: number, height: number, energy: number, beat: number) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const baseRadius = Math.min(width, height) * (0.23 + energy * 0.05);
  const pulse = 0.55 + beat * 0.45;

  context.save();
  const glow = context.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, baseRadius * 2.1);
  glow.addColorStop(0, `rgba(127, 236, 224, ${0.1 + energy * 0.18})`);
  glow.addColorStop(0.46, `rgba(244, 207, 106, ${0.12 + beat * 0.14})`);
  glow.addColorStop(1, 'rgba(127, 236, 224, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.lineCap = 'round';
  for (let index = 0; index < 72; index += 1) {
    const angle = (index / 72) * TAU + time * 0.22;
    const wave = Math.sin(time * 7 + index * 0.62) * 0.5 + 0.5;
    const paired = qubits[index % qubits.length]?.energy ?? energy;
    const length = 12 + wave * 22 + paired * 32 + energy * 46 * pulse;
    const inner = baseRadius - 8;
    const outer = baseRadius + length;
    const hue = index % 2 === 0 ? '127, 236, 224' : '244, 207, 106';
    context.strokeStyle = `rgba(${hue}, ${0.18 + energy * 0.42 + wave * 0.16})`;
    context.lineWidth = 2 + energy * 3.8;
    context.beginPath();
    context.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    context.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    context.stroke();
  }

  context.strokeStyle = `rgba(201, 255, 248, ${0.32 + energy * 0.4})`;
  context.lineWidth = 2 + beat * 3;
  for (let ring = 0; ring < 3; ring += 1) {
    context.beginPath();
    context.arc(centerX, centerY, baseRadius + ring * 18 + beat * 10, 0, TAU);
    context.stroke();
  }
  context.restore();
}

function createQuantumScene(): SceneRuntime {
  const ripples: MeasurementRipple[] = [];
  let width = 1;
  let height = 1;
  let qubits: Qubit[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const count = Math.max(8, Math.min(16, Math.round((width * height) / 65000)));
      qubits = Array.from({ length: count }, (_, index) => qubits[index] ?? createQubit(index, width, height, count));
      qubits.forEach((qubit, index) => {
        qubit.pair = (index + Math.floor(count / 2)) % count;
      });
    },
    render({ context, time, delta, width, height, pointer, music, specialEvent }) {
      drawBackground(context, time, width, height, pointer);
      if (music.active) drawMusicVisualizer(context, qubits, time, width, height, music.energy, music.beat);
      if (specialEvent.active) drawQuantumGate(context, time, width, height, specialEvent.label);
      drawEntanglement(context, qubits, time);
      drawRipples(context, ripples, delta);
      for (const [index, qubit] of qubits.entries()) {
        if (music.active) {
          const targetAngle = (index / qubits.length) * TAU + time * (1.15 + music.beat * 2.8);
          const wave = Math.sin(time * 8 + index * 1.37) * 0.5 + 0.5;
          const targetRadius = Math.min(width, height) * (0.24 + music.energy * 0.14) + wave * music.energy * 70 + music.beat * 28;
          const targetX = width * 0.5 + Math.cos(targetAngle) * targetRadius;
          const targetY = height * 0.5 + Math.sin(targetAngle) * targetRadius;
          qubit.vx += (targetX - qubit.x) * delta * (2.4 + music.energy * 4.2);
          qubit.vy += (targetY - qubit.y) * delta * (2.4 + music.energy * 4.2);
          qubit.phase += delta * (4 + music.beat * 8 + music.energy * 10);
          qubit.collapsed = Math.max(qubit.collapsed, music.beat * music.energy * 0.65);
          qubit.energy = Math.max(qubit.energy, 0.62 + music.energy * 0.75);
        }
        if (specialEvent.active) {
          const targetAngle = (index / qubits.length) * TAU + time * 0.42;
          const targetRadius = Math.min(width, height) * 0.28;
          const targetX = width * 0.5 + Math.cos(targetAngle) * targetRadius;
          const targetY = height * 0.5 + Math.sin(targetAngle) * targetRadius;
          qubit.vx += (targetX - qubit.x) * delta * 1.6;
          qubit.vy += (targetY - qubit.y) * delta * 1.6;
          qubit.energy = Math.max(qubit.energy, 0.86);
        }
        updateQubit(qubit, qubits, ripples, pointer, delta, time, width, height);
        drawQubit(context, qubit, time);
      }
    },
  };
}

export const quantumScene: SceneDefinition = {
  id: 'quantum',
  title: 'Cuantica',
  description: 'Qubits orbitando, enredandose y colapsando al contacto del puntero.',
  Icon: Atom,
  create: createQuantumScene,
};