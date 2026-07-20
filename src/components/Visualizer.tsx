import { useEffect, useRef } from 'react';
import { visualizerTiming } from '../siteConfig';
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
    let activeTouchId: number | null = null;

    const readPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const isInside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

      return { x, y, isInside };
    };

    const updatePointer = (x: number, y: number, active: boolean) => {
      pointerRef.current = {
        x,
        y,
        dx: x - pointerRef.current.x,
        dy: y - pointerRef.current.y,
        active,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      runtime.resize?.(rect.width, rect.height);
    };

    const beginPointer = (event: PointerEvent) => {
      const { x, y, isInside } = readPointer(event);
      if (!isInside) return;

      if (event.pointerType !== 'mouse') {
        activeTouchId = event.pointerId;
      }

      updatePointer(x, y, true);
    };

    const trackPointer = (event: PointerEvent) => {
      if (activeTouchId !== null && event.pointerId !== activeTouchId) return;

      const { x, y, isInside } = readPointer(event);
      if (!isInside) {
        if (event.pointerType === 'mouse') {
          pointerRef.current = { ...pointerRef.current, dx: 0, dy: 0, active: false };
        }
        return;
      }

      updatePointer(x, y, event.pointerType === 'mouse' || activeTouchId === event.pointerId);
    };

    const endPointer = (event: PointerEvent) => {
      if (activeTouchId !== null && event.pointerId !== activeTouchId) return;

      activeTouchId = null;
      pointerRef.current = { ...pointerRef.current, dx: 0, dy: 0, active: false };
    };

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const seconds = time / 1000;
      const delta = lastTime === 0 ? visualizerTiming.firstFrameDeltaSeconds : Math.min(visualizerTiming.maxFrameDeltaSeconds, seconds - lastTime);
      lastTime = seconds;
      runtime.render({ context, time: seconds, delta, width: rect.width, height: rect.height, pointer: pointerRef.current });
      pointerRef.current.dx *= visualizerTiming.pointerVelocityDecay;
      pointerRef.current.dy *= visualizerTiming.pointerVelocityDecay;
      frame = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', beginPointer);
    window.addEventListener('pointermove', trackPointer);
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', beginPointer);
      window.removeEventListener('pointermove', trackPointer);
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
      runtime.dispose?.();
    };
  }, [scene]);

  return <canvas ref={canvasRef} className="visualizer" aria-label={scene.description} />;
}