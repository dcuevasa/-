import { Milk } from 'lucide-react';
import type { PointerPosition, SceneDefinition, SceneRuntime } from '../types';
import { clamp, clearLinear, randomRange, TAU, wrap } from '../utils/canvas';

type GrassBlade = {
  x: number;
  baseY: number;
  height: number;
  targetHeight: number;
  sway: number;
};

type VirtualPetType = 'cow';

type VirtualPet = {
  type: VirtualPetType;
  x: number;
  y: number;
  vx: number;
  direction: 1 | -1;
  jump: number;
  jumpVelocity: number;
  grazeTimer: number;
  scared: number;
  seed: number;
};

type PetDefinition = {
  type: VirtualPetType;
  create: (index: number, width: number, height: number) => VirtualPet;
  draw: (context: CanvasRenderingContext2D, pet: VirtualPet, time: number, lift?: number) => void;
  update: (pet: VirtualPet, grass: GrassBlade[], pointer: PointerPosition, delta: number, width: number, height: number) => void;
};

function createGrass(width: number, height: number) {
  const count = Math.max(90, Math.round(width / 9));
  return Array.from({ length: count }, (_, index) => {
    const x = (index / (count - 1)) * width;
    const heightBase = randomRange(12, 38);
    return {
      x,
      baseY: height * randomRange(0.78, 0.96),
      height: heightBase,
      targetHeight: heightBase,
      sway: randomRange(0, TAU),
    };
  });
}

function growGrass(grass: GrassBlade[], pointer: PointerPosition, width: number, height: number) {
  if (!pointer.active) return;

  const pointerX = pointer.x * width;
  const pointerY = pointer.y * height;
  for (const blade of grass) {
    const distance = Math.hypot(blade.x - pointerX, blade.baseY - pointerY);
    const influence = Math.max(0, 1 - distance / 150);
    blade.targetHeight = Math.min(76, blade.targetHeight + influence * 5.8);
  }
}

function eatNearbyGrass(pet: VirtualPet, grass: GrassBlade[]) {
  if (pet.scared > 0 || pet.grazeTimer <= 0) return;

  for (const blade of grass) {
    const distance = Math.abs(blade.x - pet.x);
    if (distance < 52 && blade.baseY > pet.y + 22) {
      blade.targetHeight = Math.max(8, blade.targetHeight - 0.42);
    }
  }
}

function drawGrass(context: CanvasRenderingContext2D, grass: GrassBlade[], time: number) {
  context.lineCap = 'round';
  for (const blade of grass) {
    blade.height += (blade.targetHeight - blade.height) * 0.08;
    blade.targetHeight = Math.max(10, blade.targetHeight - 0.018);
    const sway = Math.sin(time * 1.7 + blade.sway) * 4;
    const green = 105 + Math.round(clamp(blade.height, 0, 76) * 1.5);
    context.strokeStyle = `rgb(46, ${green}, 78)`;
    context.lineWidth = clamp(blade.height / 24, 1.2, 3.6);
    context.beginPath();
    context.moveTo(blade.x, blade.baseY);
    context.quadraticCurveTo(blade.x + sway, blade.baseY - blade.height * 0.58, blade.x + sway * 1.5, blade.baseY - blade.height);
    context.stroke();
  }
}

function createCow(index: number, width: number, height: number): VirtualPet {
  const direction = index % 2 === 0 ? 1 : -1;
  return {
    type: 'cow',
    x: direction === 1 ? randomRange(-120, width * 0.5) : randomRange(width * 0.5, width + 120),
    y: height * randomRange(0.64, 0.79),
    vx: direction * randomRange(22, 42),
    direction,
    jump: 0,
    jumpVelocity: 0,
    grazeTimer: randomRange(0.5, 3.5),
    scared: 0,
    seed: index * 13.7,
  };
}

function updateCow(pet: VirtualPet, grass: GrassBlade[], pointer: PointerPosition, delta: number, width: number, height: number) {
  const pointerX = pointer.x * width;
  const pointerY = pointer.y * height;
  const distance = pointer.active ? Math.hypot(pet.x - pointerX, pet.y - pointerY) : 9999;

  if (distance < 190) {
    pet.scared = 1;
    pet.direction = pet.x < pointerX ? -1 : 1;
    pet.vx += pet.direction * (130 * delta + Math.max(0, 1 - distance / 190) * 210 * delta);
    if (pet.jump === 0) pet.jumpVelocity = randomRange(160, 220);
  }

  pet.scared = Math.max(0, pet.scared - delta * 0.75);
  pet.grazeTimer -= delta;
  if (pet.grazeTimer < -1.2) {
    pet.grazeTimer = randomRange(1.4, 4.2);
  }

  const grazing = pet.grazeTimer > 0 && pet.scared === 0;
  const targetSpeed = grazing ? 8 : 28 + pet.scared * 82;
  pet.vx += (pet.direction * targetSpeed - pet.vx) * delta * 1.2;
  pet.x += pet.vx * delta;

  pet.jumpVelocity -= 360 * delta;
  pet.jump = Math.max(0, pet.jump + pet.jumpVelocity * delta);
  if (pet.jump === 0 && pet.jumpVelocity < 0) pet.jumpVelocity = 0;

  if (Math.random() < delta * (grazing ? 0.18 : 0.42)) {
    pet.jumpVelocity = grazing ? randomRange(45, 75) : randomRange(115, 175);
  }

  pet.x = wrap(pet.x, -120, width + 120);
  pet.y += (height * 0.72 - pet.y) * delta * 0.15;
  eatNearbyGrass(pet, grass);
}

function drawCow(context: CanvasRenderingContext2D, pet: VirtualPet, time: number, lift = 0) {
  const hop = pet.jump + Math.abs(Math.sin(time * 5 + pet.seed)) * (pet.scared > 0 ? 4 : 1.5);
  const x = pet.x;
  const y = pet.y - hop - lift;
  const direction = pet.direction;
  const headDip = pet.grazeTimer > 0 && pet.scared === 0 ? 10 : 0;

  context.save();
  context.translate(x, y);
  context.scale(direction, 1);

  context.fillStyle = '#fff7e8';
  context.strokeStyle = '#4a3428';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(-34, -24, 70, 38, 16);
  context.fill();
  context.stroke();

  context.fillStyle = '#3f3028';
  context.beginPath();
  context.ellipse(-12, -10, 12, 8, -0.3, 0, TAU);
  context.ellipse(18, 4, 14, 9, 0.25, 0, TAU);
  context.fill();

  context.strokeStyle = '#4a3428';
  for (const legX of [-22, -6, 16, 30]) {
    context.beginPath();
    context.moveTo(legX, 10);
    context.lineTo(legX + Math.sin(time * 7 + legX) * 3, 29);
    context.stroke();
  }

  context.fillStyle = '#fff7e8';
  context.beginPath();
  context.roundRect(30, -29 + headDip, 28, 26, 10);
  context.fill();
  context.stroke();

  context.fillStyle = '#e7b6a0';
  context.beginPath();
  context.ellipse(47, -8 + headDip, 13, 7, 0, 0, TAU);
  context.fill();
  context.stroke();

  context.fillStyle = '#241d1a';
  context.beginPath();
  context.arc(42, -21 + headDip, 2.2, 0, TAU);
  context.fill();

  context.strokeStyle = '#fff7e8';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-35, -12);
  context.quadraticCurveTo(-52, -24, -54, -6 + Math.sin(time * 4 + pet.seed) * 8);
  context.stroke();

  context.restore();
}

function drawUfo(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const x = width * 0.5 + Math.sin(time * 0.7) * width * 0.16;
  const y = height * 0.19 + Math.cos(time * 0.9) * 14;
  const beamWidth = Math.min(width * 0.34, 260);

  context.save();
  const beam = context.createLinearGradient(x, y + 22, x, height * 0.82);
  beam.addColorStop(0, 'rgba(190, 255, 210, 0.36)');
  beam.addColorStop(1, 'rgba(190, 255, 210, 0)');
  context.fillStyle = beam;
  context.beginPath();
  context.moveTo(x - 36, y + 16);
  context.lineTo(x + 36, y + 16);
  context.lineTo(x + beamWidth, height * 0.82);
  context.lineTo(x - beamWidth, height * 0.82);
  context.closePath();
  context.fill();

  context.fillStyle = '#d8f7ef';
  context.strokeStyle = '#2d5b55';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(x, y, 72, 18, 0, 0, TAU);
  context.fill();
  context.stroke();
  context.fillStyle = '#92d7df';
  context.beginPath();
  context.ellipse(x, y - 14, 34, 22, 0, Math.PI, TAU);
  context.fill();
  context.stroke();
  context.fillStyle = '#fff4a8';
  for (let light = -2; light <= 2; light += 1) {
    context.beginPath();
    context.arc(x + light * 24, y + 2 + Math.sin(time * 8 + light) * 2, 4, 0, TAU);
    context.fill();
  }
  if (label) {
    context.fillStyle = 'rgba(255, 248, 235, 0.78)';
    context.font = '700 14px Outfit, sans-serif';
    context.textAlign = 'center';
    context.fillText(label, x, y - 38);
  }
  context.restore();
}

const petDefinitions: PetDefinition[] = [
  {
    type: 'cow',
    create: createCow,
    draw: drawCow,
    update: updateCow,
  },
];

function createPetsScene(): SceneRuntime {
  let width = 1;
  let height = 1;
  let grass: GrassBlade[] = [];
  let pets: VirtualPet[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      grass = createGrass(width, height);
      const cowDefinition = petDefinitions[0];
      const count = clamp(Math.round(width / 340), 3, 6);
      pets = Array.from({ length: count }, (_, index) => pets[index] ?? cowDefinition.create(index, width, height));
    },
    render({ context, time, delta, pointer, music, specialEvent }) {
      clearLinear(context, width, height, ['#9fd0d4', '#e7d6a1']);

      context.fillStyle = '#6ca35b';
      context.fillRect(0, height * 0.76, width, height * 0.24);
      growGrass(grass, pointer, width, height);
      drawGrass(context, grass, time);
      if (specialEvent.active) drawUfo(context, time, width, height, specialEvent.label);

      const cowDefinition = petDefinitions[0];
      for (const pet of pets) {
        cowDefinition.update(pet, grass, pointer, delta, width, height);
        const musicLift = music.active ? Math.max(10, music.energy * 78) * (0.45 + music.beat) + Math.sin(time * 8 + pet.seed) * music.energy * 14 : 0;
        const lift = (specialEvent.active ? 82 + Math.sin(time * 2.8 + pet.seed) * 18 : 0) + musicLift;
        cowDefinition.draw(context, pet, time, lift);
      }
    },
  };
}

export const petsScene: SceneDefinition = {
  id: 'pets',
  title: 'Vaquitas',
  description: 'Mascotas virtuales: vacas saltando, comiendo pasto y huyendo del puntero.',
  Icon: Milk,
  create: createPetsScene,
};