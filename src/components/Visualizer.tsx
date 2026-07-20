import { useEffect, useRef } from 'react';
import type { SceneDefinition } from '../visuals/registry';

type VisualizerProps = {
  scene: SceneDefinition;
};

export function Visualizer({ scene }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, dx: 0, dy: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const runtime = scene.create();
    let frame = 0;
    let lastTime = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      runtime.resize?.(rect.width, rect.height);
    };

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const seconds = time / 1000;
      const delta = lastTime === 0 ? 1 / 60 : Math.min(0.05, seconds - lastTime);
      lastTime = seconds;
      runtime.render({ context, time: seconds, delta, width: rect.width, height: rect.height, pointer: pointerRef.current });
      pointerRef.current.dx *= 0.82;
      pointerRef.current.dy *= 0.82;
      frame = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      runtime.dispose?.();
    };
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      className="visualizer"
      aria-label={scene.description}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        pointerRef.current = {
          x,
          y,
          dx: x - pointerRef.current.x,
          dy: y - pointerRef.current.y,
          active: true,
        };
      }}
      onPointerLeave={() => {
        pointerRef.current = { ...pointerRef.current, dx: 0, dy: 0, active: false };
      }}
    />
  );
}