import { daisiesScene } from './scenes/daisies';
import { filmScene } from './scenes/film';
import { octopusScene } from './scenes/octopus';
import { pagesScene } from './scenes/pages';
import type { SceneDefinition, SceneId } from './types';

export type { SceneDefinition, SceneId } from './types';

export const scenes: SceneDefinition[] = [octopusScene, daisiesScene, pagesScene, filmScene];

export function findScene(sceneId: SceneId) {
  return scenes.find((scene) => scene.id === sceneId) ?? scenes[0];
}