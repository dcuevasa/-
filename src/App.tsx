import { useEffect, useRef, useState } from 'react';
import { DocumentContent } from './components/DocumentContent';
import { Visualizer } from './components/Visualizer';
import { documents } from './lib/documents';
import { siteCopy, visualizerTiming } from './siteConfig';
import { findScene, scenes, type SceneId } from './visuals/registry';

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
      hideHeroTextTimer.current = window.setTimeout(() => setIsHeroTextVisible(false), visualizerTiming.heroTextVisibleMs);
    };

    const registerInteraction = () => {
      window.clearTimeout(hideHeroTextTimer.current);
      window.clearTimeout(idleHeroTextTimer.current);
      window.clearTimeout(pointerHideTimer.current);
      setIsHeroTextVisible(false);
      idleHeroTextTimer.current = window.setTimeout(revealHeroText, visualizerTiming.heroTextIdleMs);
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
        idleHeroTextTimer.current = window.setTimeout(revealHeroText, visualizerTiming.heroTextIdleMs);
      }, visualizerTiming.heroPointerHideMs);
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
      <section className="hero" aria-label={siteCopy.hero.visualizerLabel}>
        <Visualizer scene={activeScene} />

        <div className={isHeroTextVisible ? 'hero-content is-visible' : 'hero-content'}>
          <p className="eyebrow">{siteCopy.hero.eyebrow}</p>
          <h1>{siteCopy.hero.title}</h1>
          {siteCopy.hero.showIntro && siteCopy.hero.intro ? <p className="intro">{siteCopy.hero.intro}</p> : null}
        </div>

        <nav className={isHeroTextVisible ? 'scene-dock is-visible' : 'scene-dock'} aria-label={siteCopy.hero.scenePickerLabel}>
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

      <section className="document-section" aria-label={siteCopy.documents.sectionLabel}>
        <div className="section-heading">
          <p className="eyebrow">{siteCopy.documents.eyebrow}</p>
          <h2>{siteCopy.documents.title}</h2>
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