import { PawPrint } from 'lucide-react';
import type { PointerPosition, SceneDefinition, SceneRuntime } from '../types';
import { clamp, clearLinear, randomRange, TAU } from '../utils/canvas';

type EsnupiActivity = 'sleep' | 'stand' | 'write' | 'dance' | 'pilot' | 'snack' | 'chase';

type Esnupi = {
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  activity: EsnupiActivity;
  activityTime: number;
  writePause: number;
  writeReveal: number;
  writeText: string;
  blink: number;
  hop: number;
};

type Bird = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wing: number;
  perchX: number;
  perchY: number;
  hasPerch: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  text: string;
};

const activities: EsnupiActivity[] = ['sleep', 'stand', 'write', 'dance', 'pilot', 'snack'];
const textModules = import.meta.glob('../../../docs/texto/*.{md,txt}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function extractFragments() {
  const words = Object.values(textModules)
    .join('\n')
    .replaceAll(/[#_*`.,:;!?()]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && word.length < 13);

  const fragments: string[] = [];
  for (let index = 0; index < words.length - 3; index += 3) {
    fragments.push(words.slice(index, index + Math.floor(randomRange(2, 5))).join(' '));
  }

  return fragments.length > 0 ? fragments : ['te quiero', 'dar el mar', 'olor a ti'];
}

const textFragments = extractFragments();

function randomFragment() {
  return textFragments[Math.floor(randomRange(0, textFragments.length))];
}

function randomWriteText(currentText = '') {
  let nextText = randomFragment().split(/\s+/).slice(0, 4).join(' ');
  for (let attempt = 0; attempt < 4 && nextText === currentText; attempt += 1) {
    nextText = randomFragment().split(/\s+/).slice(0, 4).join(' ');
  }

  return nextText;
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;

  let fitted = text;
  while (fitted.length > 1 && context.measureText(`${fitted}...`).width > maxWidth) {
    fitted = fitted.slice(0, -1).trimEnd();
  }

  return `${fitted}...`;
}

function nextActivity(activity: EsnupiActivity) {
  const activityIndex = activities.indexOf(activity);
  if (activityIndex < 0) return 'stand';

  return activities[(activityIndex + 1) % activities.length];
}

function drawHouse(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.translate(x, y);

  context.fillStyle = '#a92f32';
  context.strokeStyle = '#4b1d1b';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-105, -36);
  context.lineTo(0, -112);
  context.lineTo(105, -36);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = '#c94a45';
  context.beginPath();
  context.roundRect(-82, -38, 164, 96, 8);
  context.fill();
  context.stroke();

  context.fillStyle = '#6b2d26';
  context.beginPath();
  context.roundRect(-26, 0, 52, 58, 18);
  context.fill();

  context.fillStyle = '#ffe19f';
  context.font = '700 13px Outfit, sans-serif';
  context.textAlign = 'center';
  context.fillText('ESNUPI', 0, -15);
  context.restore();
}

function drawSleepingEsnupi(context: CanvasRenderingContext2D, time: number, houseX: number, houseY: number) {
  const breath = Math.sin(time * 1.7) * 2;
  context.save();
  context.translate(houseX + Math.sin(time * 0.6) * 2, houseY - 128 + breath);

  context.fillStyle = '#fff8ec';
  context.strokeStyle = '#211c19';
  context.lineWidth = 3.6;

  context.beginPath();
  context.ellipse(-34, 17, 70, 21, -0.02, 0, TAU);
  context.fill();
  context.stroke();

  context.beginPath();
  context.ellipse(50, -1, 39, 29, -0.1, 0, TAU);
  context.fill();
  context.stroke();

  context.fillStyle = '#211c19';
  context.beginPath();
  context.ellipse(20, 9, 12, 34, 0.34, 0, TAU);
  context.fill();

  context.beginPath();
  context.ellipse(84, 3, 8, 5, 0, 0, TAU);
  context.fill();

  context.strokeStyle = '#211c19';
  context.lineWidth = 2.4;
  context.beginPath();
  context.arc(62, -9, 4, 0, Math.PI);
  context.stroke();

  context.fillStyle = 'rgba(244, 167, 151, 0.36)';
  context.beginPath();
  context.arc(48, 4, 5, 0, TAU);
  context.fill();

  context.strokeStyle = '#211c19';
  context.lineWidth = 3;
  for (const footX of [-72, -42, -12]) {
    context.beginPath();
    context.moveTo(footX, 31);
    context.lineTo(footX + 14, 31 + Math.sin(time * 2 + footX) * 1.5);
    context.stroke();
  }

  context.fillStyle = '#fff8ec';
  context.font = '700 16px Outfit, sans-serif';
  context.fillText('z', -83, -9 + Math.sin(time) * 2);
  context.font = '700 22px Outfit, sans-serif';
  context.fillText('z', -104, -31 + Math.sin(time + 1) * 2);
  context.restore();
}

function drawStandingEsnupi(context: CanvasRenderingContext2D, esnupi: Esnupi, time: number) {
  const dance = esnupi.activity === 'dance' ? Math.sin(time * 7.5) : 0;
  const danceStep = esnupi.activity === 'dance' ? Math.cos(time * 7.5) : 0;
  const y = esnupi.y - esnupi.hop - Math.abs(dance) * 12;
  const danceX = danceStep * (esnupi.activity === 'dance' ? 9 : 0);
  const wag = Math.sin(time * 8) * 5;
  const leftArmLift = esnupi.activity === 'dance' ? 16 + dance * 11 : esnupi.activity === 'snack' ? 7 : 0;
  const rightArmLift = esnupi.activity === 'dance' ? 16 - dance * 11 : esnupi.activity === 'snack' ? 7 : 0;

  context.save();
  context.translate(esnupi.x + danceX, y);
  context.scale(esnupi.facing, 1);
  context.rotate(dance * 0.14);

  context.fillStyle = '#fff8ec';
  context.strokeStyle = '#211c19';
  context.lineWidth = 3.8;

  context.fillStyle = '#fff8ec';
  context.beginPath();
  context.ellipse(-36, 31 + wag * 0.08, 13, 5.5, 0.02, 0, TAU);
  context.fill();
  context.stroke();

  context.strokeStyle = '#211c19';
  context.lineWidth = 3.8;

  context.fillStyle = '#fff8ec';

  for (const [index, legX] of [-11, 12].entries()) {
    const step = Math.sin(time * 7.5 + index * Math.PI) * (esnupi.activity === 'dance' ? 15 : 2);
    const footLift = esnupi.activity === 'dance' ? Math.max(0, Math.sin(time * 7.5 + index * Math.PI)) * 8 : 0;
    context.beginPath();
    context.roundRect(legX - 5 + step * 0.16, 31 - footLift * 0.2, 10, 31, 6);
    context.fill();
    context.stroke();
    context.beginPath();
    context.ellipse(legX + step + 8, 64 - footLift, 18, 7.5, -0.04, 0, TAU);
    context.fill();
    context.stroke();
  }

  context.beginPath();
  context.moveTo(-18, -8);
  context.bezierCurveTo(-34, -8 - leftArmLift * 0.42, -39, 12 - leftArmLift * 0.28, -32, 25 - leftArmLift * 0.2);
  context.bezierCurveTo(-24, 30 - leftArmLift * 0.16, -18, 17 - leftArmLift * 0.22, -12, 1);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(15, -7);
  context.bezierCurveTo(29, -9 - rightArmLift * 0.28, 35, 11 - rightArmLift * 0.18, 29, 24 - rightArmLift * 0.12);
  context.bezierCurveTo(21, 30 - rightArmLift * 0.12, 16, 15 - rightArmLift * 0.16, 10, 1);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(-13, -16);
  context.bezierCurveTo(8, -15, 25, 5, 23, 28);
  context.bezierCurveTo(20, 45, -6, 48, -21, 35);
  context.bezierCurveTo(-33, 24, -30, 1, -18, -13);
  context.bezierCurveTo(-16, -15, -15, -16, -13, -16);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = '#fff8ec';
  context.beginPath();
  context.roundRect(-15, -44, 18, 33, 9);
  context.fill();
  context.stroke();

  context.fillStyle = '#d94e4a';
  context.beginPath();
  context.roundRect(-19, -18, 27, 7, 5);
  context.fill();

  context.save();
  context.translate(14, -60);
  context.fillStyle = '#fff8ec';
  context.strokeStyle = '#211c19';
  context.lineWidth = 3.8;
  context.beginPath();
  context.moveTo(-31, -18);
  context.bezierCurveTo(-16, -32, 12, -31, 29, -18);
  context.bezierCurveTo(34, -14, 43, 1, 60, 10);
  context.bezierCurveTo(68, 17, 61, 31, 43, 34);
  context.bezierCurveTo(31, 37, 8, 36, -8, 29);
  context.bezierCurveTo(-18, 25, -27, 19, -31, 12);
  context.bezierCurveTo(-42, -1, -42, -11, -31, -18);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = '#211c19';
  context.beginPath();
  context.ellipse(-26, 9, 11, 31, 0.18, 0, TAU);
  context.fill();

  context.fillStyle = '#211c19';
  context.beginPath();
  context.ellipse(68, 17, 9, 4.2, 0, 0, TAU);
  context.fill();
  context.beginPath();
  context.roundRect(13, -15, 4.5, esnupi.blink > 0 ? 2 : 11, 3);
  context.fill();

  context.strokeStyle = '#211c19';
  context.lineWidth = 2.4;
  context.beginPath();
  context.moveTo(8, -23);
  context.quadraticCurveTo(15, -28, 24, -24);
  context.stroke();

  context.strokeStyle = '#211c19';
  context.lineWidth = 2.4;
  context.beginPath();
  context.moveTo(29, 17);
  context.quadraticCurveTo(18, 25, 6, 18);
  context.stroke();
  context.restore();

  context.restore();
}

function drawEsnupi(context: CanvasRenderingContext2D, esnupi: Esnupi, time: number, houseX: number, houseY: number) {
  if (esnupi.activity === 'sleep') {
    drawSleepingEsnupi(context, time, houseX, houseY);
    return;
  }

  drawStandingEsnupi(context, esnupi, time);
}

function drawProps(context: CanvasRenderingContext2D, esnupi: Esnupi, time: number, houseX: number, houseY: number) {
  context.save();
  context.fillStyle = 'rgba(255, 248, 230, 0.92)';
  context.strokeStyle = 'rgba(33, 28, 25, 0.72)';
  context.lineWidth = 2;

  if (esnupi.activity === 'dance') {
    context.fillStyle = 'rgba(255, 241, 168, 0.92)';
    context.font = '700 22px Outfit, sans-serif';
    context.textAlign = 'center';
    for (const [index, note] of ['♪', '♫', '♪'].entries()) {
      const noteTime = time * 2.8 + index * 1.7;
      context.fillText(note, esnupi.x + Math.sin(noteTime) * 48 + (index - 1) * 30, esnupi.y - 88 - Math.cos(noteTime) * 12);
    }
  }

  if (esnupi.activity === 'write') {
    const pencilJitter = Math.sin(time * 18) * 2.2;
    const revealedText = esnupi.writeText.slice(0, Math.max(1, Math.floor(esnupi.writeReveal)));

    context.translate(esnupi.x + 82 * esnupi.facing, esnupi.y + 16);
    context.beginPath();
    context.roundRect(-68, -28, 136, 52, 8);
    context.fill();
    context.stroke();

    context.strokeStyle = 'rgba(47, 42, 40, 0.22)';
    context.lineWidth = 1.4;
    for (const lineY of [-12, -2, 8, 18]) {
      context.beginPath();
      context.moveTo(-54, lineY);
      context.lineTo(54, lineY);
      context.stroke();
    }

    context.fillStyle = '#2f2a28';
    context.font = '700 11px Outfit, sans-serif';
    context.textAlign = 'left';
    context.save();
    context.beginPath();
    context.rect(-57, -21, 114, 38);
    context.clip();
    context.fillText(fitText(context, revealedText, 110), -54, 2);
    context.restore();

    context.save();
    context.translate(-44 + Math.min(82, esnupi.writeReveal * 3.6), -4 + pencilJitter);
    context.rotate(-0.62);
    context.fillStyle = '#f4b33e';
    context.strokeStyle = '#6b4320';
    context.lineWidth = 1.6;
    context.beginPath();
    context.roundRect(-15, -2.6, 26, 5.2, 2.4);
    context.fill();
    context.stroke();
    context.fillStyle = '#2f2a28';
    context.beginPath();
    context.moveTo(11, -2.6);
    context.lineTo(17, 0);
    context.lineTo(11, 2.6);
    context.closePath();
    context.fill();
    context.restore();
  }

  if (esnupi.activity === 'pilot') {
    const phase = (time * 0.22) % 1;
    const planeX = -136 + phase * 288;
    const planeY = Math.sin(phase * TAU) * 28 + Math.sin(time * 5) * 4;

    context.save();
    context.translate(houseX, houseY - 148);
    context.strokeStyle = 'rgba(255, 246, 209, 0.82)';
    context.lineWidth = 2.6;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(Math.max(-136, planeX - 108), planeY + 8);
    context.quadraticCurveTo(planeX - 58, planeY - 42, planeX - 14, planeY + 2);
    context.stroke();
    context.setLineDash([]);

    context.save();
    context.translate(planeX, planeY);
    context.rotate(Math.cos(phase * TAU) * 0.2);
    context.fillStyle = '#fff2a8';
    context.strokeStyle = '#7a5a26';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(-16, -12);
    context.lineTo(-8, 0);
    context.lineTo(-16, 12);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(-8, 0);
    context.lineTo(8, 0);
    context.stroke();
    context.restore();
    context.restore();
  }

  if (esnupi.activity === 'snack') {
    const chew = Math.max(0, Math.sin(time * 9));
    const bite = Math.floor(time * 2.8) % 3;
    context.translate(esnupi.x + 68 * esnupi.facing, esnupi.y - 36 + chew * 3);
    context.fillStyle = '#f0d19c';
    context.strokeStyle = 'rgba(33, 28, 25, 0.72)';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, 22, 10, 0, 0, TAU);
    context.fill();
    context.stroke();
    context.fillStyle = '#8b5a2b';
    for (const crumbX of [-8, 1, 9]) {
      context.beginPath();
      context.arc(crumbX, -2 + Math.sin(time * 6 + crumbX) * 1.2, 1.5, 0, TAU);
      context.fill();
    }
    context.fillStyle = '#8fcbd0';
    context.beginPath();
    context.arc(14 - bite * 4, -5 + bite * 2, 6, 0, TAU);
    context.fill();

    context.fillStyle = 'rgba(139, 90, 43, 0.85)';
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.arc(-28 - index * 7, 4 + Math.sin(time * 7 + index) * 4, 2.2 - index * 0.35, 0, TAU);
      context.fill();
    }
  }

  context.restore();
}

function drawBird(context: CanvasRenderingContext2D, bird: Bird, time: number) {
  const wing = Math.sin(time * 12 + bird.wing) * 8;
  context.save();
  context.translate(bird.x, bird.y);
  context.fillStyle = '#ffd54c';
  context.strokeStyle = '#5e4b18';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 14, 11, 0, 0, TAU);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-7, 0);
  context.quadraticCurveTo(-23, -8 - wing, -10, 8);
  context.stroke();
  context.fillStyle = '#f28b45';
  context.beginPath();
  context.moveTo(13, -2);
  context.lineTo(25, 3);
  context.lineTo(13, 7);
  context.closePath();
  context.fill();
  context.fillStyle = '#2b2417';
  context.beginPath();
  context.arc(5, -4, 2, 0, TAU);
  context.fill();
  context.restore();
}

function drawSparks(context: CanvasRenderingContext2D, sparks: Spark[], delta: number) {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    spark.life -= delta;
    spark.x += spark.vx * delta;
    spark.y += spark.vy * delta;
    if (spark.life <= 0) {
      sparks.splice(index, 1);
      continue;
    }
    context.globalAlpha = clamp(spark.life, 0, 1);
    context.fillStyle = spark.text === '✦' ? '#fff1a8' : '#fff8ec';
    context.font = spark.text === '✦' ? '22px Outfit, sans-serif' : '700 14px Outfit, sans-serif';
    context.textAlign = 'center';
    context.fillText(spark.text, spark.x, spark.y);
    context.globalAlpha = 1;
  }
}

function drawEsnupiPortal(context: CanvasRenderingContext2D, time: number, width: number, height: number, label: string | null) {
  const x = width * 0.5;
  const y = height * 0.25;
  const pulse = Math.sin(time * 3) * 0.5 + 0.5;
  const radius = Math.min(width, height) * (0.11 + pulse * 0.015);

  context.save();
  const glow = context.createRadialGradient(x, y, 0, x, y, radius * 3.2);
  glow.addColorStop(0, `rgba(255, 241, 168, ${0.42 + pulse * 0.2})`);
  glow.addColorStop(0.42, 'rgba(143, 203, 208, 0.22)');
  glow.addColorStop(1, 'rgba(143, 203, 208, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = `rgba(255, 248, 236, ${0.62 + pulse * 0.28})`;
  context.lineWidth = 3;
  for (let ring = 0; ring < 3; ring += 1) {
    context.beginPath();
    context.ellipse(x, y, radius + ring * 16, radius * 0.52 + ring * 8, time * 0.4 + ring * 0.7, 0, TAU);
    context.stroke();
  }

  context.fillStyle = '#fff1a8';
  context.font = '700 18px Outfit, sans-serif';
  context.textAlign = 'center';
  for (let star = 0; star < 7; star += 1) {
    const angle = (star / 7) * TAU + time * 0.8;
    context.fillText('✦', x + Math.cos(angle) * radius * 1.55, y + Math.sin(angle) * radius * 0.9);
  }
  if (label) {
    context.fillStyle = 'rgba(255, 248, 236, 0.82)';
    context.font = '750 15px Outfit, sans-serif';
    context.fillText(label, x, y + radius * 1.35);
  }
  context.restore();
}

function updateBird(bird: Bird, esnupi: Esnupi, pointer: PointerPosition, delta: number, width: number, height: number) {
  if (pointer.active) {
    bird.perchX = pointer.x * width;
    bird.perchY = pointer.y * height;
    bird.hasPerch = true;
  }

  const idleX = width * 0.5 + Math.sin(bird.wing * 0.22) * width * 0.22;
  const idleY = height * 0.42 + Math.cos(bird.wing * 0.28) * 34;
  const fleeDirection = bird.x >= esnupi.x ? 1 : -1;
  const targetX = bird.hasPerch ? bird.perchX : esnupi.activity === 'chase' ? bird.x + fleeDirection * 130 : idleX;
  const targetY = bird.hasPerch ? bird.perchY : esnupi.activity === 'chase' ? height * 0.38 + Math.sin(bird.wing * 0.35) * 28 : idleY;
  bird.vx += (targetX - bird.x) * delta * 1.45;
  bird.vy += (targetY - bird.y) * delta * 1.45;
  bird.vx *= 0.92;
  bird.vy *= 0.92;
  bird.x = clamp(bird.x + bird.vx * delta * 18, 20, width - 20);
  bird.y = clamp(bird.y + bird.vy * delta * 18, 30, height - 40);
  bird.wing += delta * 10;
}

function updateEsnupi(esnupi: Esnupi, bird: Bird, pointer: PointerPosition, delta: number, width: number, height: number, sparks: Spark[]) {
  esnupi.activityTime -= delta;
  esnupi.blink = Math.max(0, esnupi.blink - delta);
  if (esnupi.activity === 'write') {
    if (esnupi.writeReveal < esnupi.writeText.length) {
      esnupi.writeReveal = Math.min(esnupi.writeText.length, esnupi.writeReveal + delta * 8);
      esnupi.writePause = 0.8;
    } else {
      esnupi.writePause -= delta;
      if (esnupi.writePause <= 0) {
        esnupi.writeText = randomWriteText(esnupi.writeText);
        esnupi.writeReveal = 0;
        esnupi.writePause = 0.8;
      }
    }
  } else {
    esnupi.writePause = 0;
    esnupi.writeReveal = 0;
  }
  if (Math.random() < delta * 0.12) esnupi.blink = 0.1;

  if (esnupi.activityTime <= 0) {
    esnupi.activity = nextActivity(esnupi.activity);
    esnupi.activityTime = randomRange(5, 8);
    if (esnupi.activity === 'write') {
      esnupi.writeText = randomWriteText(esnupi.writeText);
      esnupi.writePause = 0.8;
      esnupi.writeReveal = 0;
    }
    sparks.push({ x: esnupi.x + 44, y: esnupi.y - 102, vx: randomRange(-10, 10), vy: randomRange(-28, -16), life: 1.1, text: '✦' });
  }

  const chaseRadius = esnupi.activity === 'chase' ? 1.45 : 1;
  const birdInChaseArea = ((bird.x - esnupi.x) / 190) ** 2 + ((bird.y - (esnupi.y - 100)) / 105) ** 2 < chaseRadius;

  if (pointer.active) {
    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const distance = Math.hypot(pointerX - esnupi.x, pointerY - esnupi.y);
    if (distance < 155) {
      esnupi.activity = 'dance';
      esnupi.activityTime = Math.max(esnupi.activityTime, 3.5);
      esnupi.facing = pointerX > esnupi.x ? 1 : -1;
      esnupi.hop = Math.max(esnupi.hop, 18);
      if (Math.random() < delta * 2.2) sparks.push({ x: pointerX, y: pointerY, vx: randomRange(-20, 20), vy: randomRange(-36, -12), life: 0.9, text: '✦' });
    }
  }

  if (birdInChaseArea) {
    esnupi.activity = 'chase';
    esnupi.activityTime = 1.4;
    esnupi.facing = bird.x > esnupi.x ? 1 : -1;
  }

  const chase = esnupi.activity === 'chase';
  const walking = esnupi.activity === 'stand';
  const moving = walking || esnupi.activity === 'dance' || esnupi.activity === 'snack' || chase;
  if (chase) {
    esnupi.vx += (bird.x - esnupi.x) * delta * 0.9;
    esnupi.hop = Math.max(esnupi.hop, Math.abs(Math.sin(bird.wing * 1.4)) * 8);
  } else {
    esnupi.vx += moving ? esnupi.facing * (walking ? 10 : 18) * delta : (0 - esnupi.vx) * delta * 1.4;
  }
  esnupi.x += esnupi.vx * delta;
  if (esnupi.x < width * 0.26) esnupi.facing = 1;
  if (esnupi.x > width * 0.74) esnupi.facing = -1;
  esnupi.x = clamp(esnupi.x, width * 0.22, width * 0.78);
  esnupi.y = height * 0.67;
  esnupi.vx *= 0.95;
  esnupi.hop = Math.max(0, esnupi.hop - 82 * delta);
}

function createEsnupiScene(): SceneRuntime {
  let width = 1;
  let height = 1;
  let esnupi: Esnupi = { x: 0, y: 0, vx: 0, facing: 1, activity: 'sleep', activityTime: 6, writePause: 0, writeReveal: 0, writeText: randomWriteText(), blink: 0, hop: 0 };
  let bird: Bird = { x: 0, y: 0, vx: 0, vy: 0, wing: 0, perchX: 0, perchY: 0, hasPerch: false };
  const sparks: Spark[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      esnupi = { ...esnupi, x: width * 0.5, y: height * 0.67 };
      bird = { ...bird, x: width * 0.42, y: height * 0.42, perchX: bird.hasPerch ? clamp(bird.perchX, 20, width - 20) : 0, perchY: bird.hasPerch ? clamp(bird.perchY, 30, height - 40) : 0 };
    },
    render({ context, time, delta, pointer, music, specialEvent }) {
      clearLinear(context, width, height, ['#8fcbd0', '#f0d49b']);
      const houseX = width * 0.5;
      const houseY = height * 0.73;
      if (specialEvent.active) drawEsnupiPortal(context, time, width, height, specialEvent.label);

      context.fillStyle = '#6caf66';
      context.fillRect(0, height * 0.76, width, height * 0.24);
      for (let x = -20; x < width + 20; x += 18) {
        context.strokeStyle = 'rgba(49, 111, 55, 0.58)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x, height * 0.83);
        context.quadraticCurveTo(x + Math.sin(time * 2 + x) * 8, height * 0.78, x + 4, height * 0.735);
        context.stroke();
      }

      if (music.active && esnupi.activity !== 'chase' && !specialEvent.active) {
        esnupi.activity = 'dance';
        esnupi.activityTime = Math.max(esnupi.activityTime, 2.2);
        esnupi.hop = Math.max(esnupi.hop, music.energy * 26 + music.beat * 8);
      }

      if (specialEvent.active && esnupi.activity !== 'chase') {
        esnupi.activity = 'pilot';
        esnupi.activityTime = Math.max(esnupi.activityTime, 2.5);
      }
      updateEsnupi(esnupi, bird, pointer, delta, width, height, sparks);
      updateBird(bird, esnupi, pointer, delta, width, height);
      if (music.active) {
        bird.vx += Math.cos(time * 6) * music.energy * 28 * delta;
        bird.vy += Math.sin(time * 7) * music.energy * 22 * delta;
        if (Math.random() < delta * music.energy * 4) sparks.push({ x: esnupi.x + randomRange(-42, 42), y: esnupi.y - 112, vx: randomRange(-18, 18), vy: randomRange(-38, -18), life: 0.75, text: '♪' });
      }
      if (specialEvent.active) {
        const orbit = time * 1.9;
        const targetX = width * 0.5 + Math.cos(orbit) * Math.min(width * 0.22, 170);
        const targetY = height * 0.25 + Math.sin(orbit) * Math.min(height * 0.1, 58);
        bird.vx += (targetX - bird.x) * delta * 1.6;
        bird.vy += (targetY - bird.y) * delta * 1.6;
        if (Math.random() < delta * 2.2) sparks.push({ x: bird.x, y: bird.y, vx: randomRange(-14, 14), vy: randomRange(-18, -6), life: 0.8, text: '✦' });
      }
      drawHouse(context, houseX, houseY);
      drawProps(context, esnupi, time, houseX, houseY);
      drawEsnupi(context, esnupi, time, houseX, houseY);
      drawBird(context, bird, time);
      drawSparks(context, sparks, delta);
    },
  };
}

export const esnupiScene: SceneDefinition = {
  id: 'esnupi',
  title: 'Esnupi',
  description: 'Esnupi con su casita y su pajarito haciendo pequenas rutinas de mascota virtual.',
  Icon: PawPrint,
  create: createEsnupiScene,
};