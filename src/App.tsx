import { useEffect, useRef, useState } from 'react';
import { DocumentContent } from './components/DocumentContent';
import { Visualizer } from './components/Visualizer';
import { documents } from './lib/documents';
import { findScene, scenes, type SceneId } from './visuals/registry';

const HERO_TEXT_VISIBLE_MS = 9000;
const HERO_TEXT_IDLE_MS = 7000;
const HERO_POINTER_HIDE_MS = 10000;

export function App() {
  const [activeSceneId, setActiveSceneId] = useState<SceneId>(scenes[0].id);
  const [isHeroTextVisible, setIsHeroTextVisible] = useState(true);
  const hideHeroTextTimer = useRef<number | undefined>(undefined);
  const idleHeroTextTimer = useRef<number | undefined>(undefined);
  const pointerHideTimer = useRef<number | undefined>(undefined);
  const activeScene = findScene(activeSceneId);

  useEffect(() => {
    const clearHeroTimers = () => {
      window.clearTimeout(hideHeroTextTimer.current);
      window.clearTimeout(idleHeroTextTimer.current);
      window.clearTimeout(pointerHideTimer.current);
    };

    const revealHeroText = () => {
      window.clearTimeout(hideHeroTextTimer.current);
      setIsHeroTextVisible(true);
      hideHeroTextTimer.current = window.setTimeout(() => setIsHeroTextVisible(false), HERO_TEXT_VISIBLE_MS);
    };

    const registerInteraction = () => {
      window.clearTimeout(hideHeroTextTimer.current);
      window.clearTimeout(idleHeroTextTimer.current);
      window.clearTimeout(pointerHideTimer.current);
      setIsHeroTextVisible(false);
      idleHeroTextTimer.current = window.setTimeout(revealHeroText, HERO_TEXT_IDLE_MS);
    };

    const isInsideHero = (event: PointerEvent | TouchEvent) => {
      const hero = document.querySelector<HTMLElement>('.hero');
      if (!hero) return false;

      const point = 'touches' in event ? event.touches[0] : event;
      if (!point) return false;

      const bounds = hero.getBoundingClientRect();
      return point.clientX >= bounds.left && point.clientX <= bounds.right && point.clientY >= bounds.top && point.clientY <= bounds.bottom;
    };

    const registerHeroPointerMove = (event: PointerEvent | TouchEvent) => {
      if (!isInsideHero(event)) {
        window.clearTimeout(pointerHideTimer.current);
        return;
      }

      window.clearTimeout(hideHeroTextTimer.current);
      window.clearTimeout(pointerHideTimer.current);
      pointerHideTimer.current = window.setTimeout(() => {
        setIsHeroTextVisible(false);
        idleHeroTextTimer.current = window.setTimeout(revealHeroText, HERO_TEXT_IDLE_MS);
      }, HERO_POINTER_HIDE_MS);
    };

    revealHeroText();
    window.addEventListener('scroll', revealHeroText, { passive: true });
    window.addEventListener('pointermove', registerHeroPointerMove, { passive: true });
    window.addEventListener('touchmove', registerHeroPointerMove, { passive: true });
    window.addEventListener('keydown', registerInteraction);

    return () => {
      clearHeroTimers();
      window.removeEventListener('scroll', revealHeroText);
      window.removeEventListener('pointermove', registerHeroPointerMove);
      window.removeEventListener('touchmove', registerHeroPointerMove);
      window.removeEventListener('keydown', registerInteraction);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero" aria-label="Visualizador principal">
        <Visualizer scene={activeScene} />

        <div className={isHeroTextVisible ? 'hero-content is-visible' : 'hero-content'}>
          <p className="eyebrow">Un cielo privado para mirar despacio</p>
          <h1>Cosas que te gustan, moviendose como si supieran tu nombre.</h1>
          <p className="intro">
            Pulpos, margaritas, paginas y pelicula viva en una ventana que se puede seguir ampliando con nuevas escenas.
          </p>
        </div>

        <nav className={isHeroTextVisible ? 'scene-dock is-visible' : 'scene-dock'} aria-label="Cambiar visualizacion">
          {scenes.map((scene) => {
            const isActive = scene.id === activeScene.id;
            const Icon = scene.Icon;

            return (
              <button
                className={isActive ? 'scene-button is-active' : 'scene-button'}
                type="button"
                key={scene.id}
                onClick={() => setActiveSceneId(scene.id)}
                aria-pressed={isActive}
                title={scene.title}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                <span>{scene.title}</span>
              </button>
            );
          })}
        </nav>
      </section>

      <section className="document-section" aria-label="Dibujos y poemas guardados">
        <div className="section-heading">
          <p className="eyebrow">Archivo compartido</p>
          <h2>Dibujos y textos que ya estaban aqui</h2>
        </div>

        <div className="document-list">
          {documents.map((document) => (
            <article className={document.kind === 'dibujo' ? 'document-panel is-art' : 'document-panel'} key={document.title}>
              <div className="document-header">
                <p>{document.kind}</p>
                <h3>{document.title}</h3>
              </div>
              <DocumentContent document={document} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}