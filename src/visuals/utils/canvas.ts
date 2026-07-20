export const TAU = Math.PI * 2;

export type Particle = {
  seed: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

export function createParticles(length: number): Particle[] {
  return Array.from({ length }, (_, index) => ({
    seed: index * 17.17,
    x: ((index * 37) % 100) / 100,
    y: ((index * 61) % 100) / 100,
    size: 0.6 + ((index * 13) % 12) / 10,
    speed: 0.35 + ((index * 19) % 20) / 20,
  }));
}

export function clearLinear(context: CanvasRenderingContext2D, width: number, height: number, colors: [string, string]) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export function clearRadial(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  y: number,
  colors: [string, string, string],
) {
  const radius = Math.hypot(width, height) * 0.82;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.32, colors[1]);
  gradient.addColorStop(1, colors[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

export function wrap(value: number, min: number, max: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export function angleLerp(current: number, target: number, amount: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * amount;
}

export function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}