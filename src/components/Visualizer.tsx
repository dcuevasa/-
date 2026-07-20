import { useEffect, useRef } from 'react';
import type { SceneDefinition } from '../visuals/scenes';

type VisualizerProps = {
  scene: SceneDefinition;
};

export function Visualizer({ scene }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      scene.render(context, time / 1000, rect.width, rect.height, pointerRef.current);
      frame = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      className="visualizer"
      aria-label={scene.description}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - bounds.left) / bounds.width,
          y: (event.clientY - bounds.top) / bounds.height,
        };
      }}
    />
  );
}