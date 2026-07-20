export type SceneId = 'octopus' | 'daisies' | 'pages' | 'film';

export type PointerPosition = {
  x: number;
  y: number;
};

export type SceneDefinition = {
  id: SceneId;
  title: string;
  description: string;
  render: (context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) => void;
};

type Particle = {
  seed: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

const particles = Array.from({ length: 46 }, (_, index) => ({
  seed: index * 17.17,
  x: ((index * 37) % 100) / 100,
  y: ((index * 61) % 100) / 100,
  size: 0.6 + ((index * 13) % 12) / 10,
  speed: 0.35 + ((index * 19) % 20) / 20,
}));

function clear(context: CanvasRenderingContext2D, width: number, height: number, colors: [string, string]) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawOctopus(context: CanvasRenderingContext2D, x: number, y: number, size: number, drift: number) {
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(drift) * 0.15);
  context.fillStyle = '#f08a9d';
  context.beginPath();
  context.ellipse(0, -size * 0.2, size * 0.82, size, 0, 0, Math.PI * 2);
  context.fill();

  for (let tentacle = 0; tentacle < 7; tentacle += 1) {
    const offset = (tentacle - 3) * size * 0.22;
    context.beginPath();
    context.moveTo(offset, size * 0.45);
    context.quadraticCurveTo(
      offset + Math.sin(drift + tentacle) * size * 0.28,
      size * 0.9,
      offset + Math.cos(drift + tentacle) * size * 0.36,
      size * 1.22,
    );
    context.lineWidth = size * 0.12;
    context.lineCap = 'round';
    context.strokeStyle = '#f08a9d';
    context.stroke();
  }

  context.fillStyle = '#17324d';
  context.beginPath();
  context.arc(-size * 0.25, -size * 0.26, size * 0.08, 0, Math.PI * 2);
  context.arc(size * 0.25, -size * 0.26, size * 0.08, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawDaisy(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  for (let petal = 0; petal < 10; petal += 1) {
    context.rotate((Math.PI * 2) / 10);
    context.fillStyle = '#fff8df';
    context.beginPath();
    context.ellipse(0, -size * 0.55, size * 0.18, size * 0.42, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = '#f7bc45';
  context.beginPath();
  context.arc(0, 0, size * 0.24, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPage(context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = 'rgba(255, 248, 232, 0.9)';
  context.strokeStyle = 'rgba(89, 68, 55, 0.24)';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(-size * 0.45, -size * 0.62, size * 0.9, size * 1.24, 8);
  context.fill();
  context.stroke();
  context.strokeStyle = 'rgba(89, 68, 55, 0.35)';
  for (let line = 0; line < 5; line += 1) {
    context.beginPath();
    context.moveTo(-size * 0.28, -size * 0.32 + line * size * 0.17);
    context.lineTo(size * (line % 2 === 0 ? 0.24 : 0.08), -size * 0.32 + line * size * 0.17);
    context.stroke();
  }
  context.restore();
}

function renderOctopus(context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) {
  clear(context, width, height, ['#0b3040', '#2a7d91']);
  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (const bubble of particles) {
    const y = height - (((bubble.y * height + time * 34 * bubble.speed) % (height + 80)) - 40);
    const x = bubble.x * width + Math.sin(time + bubble.seed) * 18 + (pointer.x - 0.5) * 18;
    context.beginPath();
    context.arc(x, y, bubble.size * 2.4, 0, Math.PI * 2);
    context.fill();
  }
  for (let index = 0; index < 9; index += 1) {
    const x = ((index * 0.13 + time * 0.025) % 1.1) * width - width * 0.05;
    const y = height * (0.25 + ((index * 0.19) % 0.58)) + Math.sin(time * 1.4 + index) * 28;
    drawOctopus(context, x, y, 22 + (index % 4) * 7, time + index);
  }
}

function renderDaisies(context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) {
  clear(context, width, height, ['#9fbf88', '#e5d29e']);
  for (const daisy of particles) {
    const y = ((daisy.y * height + time * 42 * daisy.speed) % (height + 120)) - 80;
    const x = daisy.x * width + Math.sin(time * daisy.speed + daisy.seed) * 46 + (pointer.x - 0.5) * 34;
    drawDaisy(context, x, y, 10 + daisy.size * 5, time * daisy.speed + daisy.seed);
  }
}

function renderPages(context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) {
  clear(context, width, height, ['#6d8a8c', '#d9b894']);
  for (const page of particles.slice(0, 30)) {
    const x = ((page.x * width + time * 48 * page.speed) % (width + 120)) - 60;
    const y = page.y * height + Math.sin(time * 1.3 + page.seed) * 42 + (pointer.y - 0.5) * 30;
    drawPage(context, x, y, 28 + page.size * 8, Math.sin(time + page.seed) * 0.8);
  }
}

function renderFilm(context: CanvasRenderingContext2D, time: number, width: number, height: number, pointer: PointerPosition) {
  clear(context, width, height, ['#261f2c', '#bb6f5a']);
  const stripHeight = Math.max(86, height * 0.18);
  const lanes = [height * 0.22, height * 0.5, height * 0.78];

  for (const [laneIndex, y] of lanes.entries()) {
    const offset = ((time * (70 + laneIndex * 18)) % 180) - 180;
    context.save();
    context.translate(offset + (pointer.x - 0.5) * 30, y);
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
}

export const scenes: SceneDefinition[] = [
  {
    id: 'octopus',
    title: 'Pulpos',
    description: 'Pulpos rosados nadando entre burbujas sobre un fondo marino.',
    render: renderOctopus,
  },
  {
    id: 'daisies',
    title: 'Margaritas',
    description: 'Margaritas cayendo y girando lentamente en el viento.',
    render: renderDaisies,
  },
  {
    id: 'pages',
    title: 'Paginas',
    description: 'Paginas de libros viajando como hojas sueltas.',
    render: renderPages,
  },
  {
    id: 'film',
    title: 'Pelicula',
    description: 'Tiras de filme cruzando la pantalla como una proyeccion en movimiento.',
    render: renderFilm,
  },
];