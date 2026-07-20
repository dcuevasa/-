import type { LucideIcon } from 'lucide-react';

export type SceneId = 'octopus' | 'daisies' | 'pages' | 'film';

export type PointerPosition = {
  x: number;
  y: number;
  active: boolean;
};

export type SceneFrame = {
  context: CanvasRenderingContext2D;
  time: number;
  delta: number;
  width: number;
  height: number;
  pointer: PointerPosition;
};

export type SceneRuntime = {
  resize?: (width: number, height: number) => void;
  render: (frame: SceneFrame) => void;
  dispose?: () => void;
};

export type SceneDefinition = {
  id: SceneId;
  title: string;
  description: string;
  Icon: LucideIcon;
  create: () => SceneRuntime;
};