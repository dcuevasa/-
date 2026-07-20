import { daisiesScene } from './scenes/daisies';
import { drawingsScene } from './scenes/drawings';
import { esnupiScene } from './scenes/esnupi';
import { filmScene } from './scenes/film';
import { octopusScene } from './scenes/octopus';
import { pagesScene } from './scenes/pages';
import { petsScene } from './scenes/pets';
import { quantumScene } from './scenes/quantum';
import type { SceneDefinition, SceneId } from './types';

export type { SceneDefinition, SceneId } from './types';

export const scenes: SceneDefinition[] = [octopusScene, esnupiScene, petsScene, quantumScene, drawingsScene, daisiesScene, pagesScene, filmScene];

export function findScene(sceneId: SceneId) {
  return scenes.find((scene) => scene.id === sceneId) ?? scenes[0];
}