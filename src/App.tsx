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
  const heroPointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDraggingHero = useRef(false);
  const isPointerInWindow = useRef(true);
  const activeScene = findScene(activeSceneId);

  useEffect(() => {
    const clearHeroTimers = () => {
      window.clearTimeout(hideHeroTextTimer.current);
    };

    const revealHeroText = (force = false) => {
      if (!force && (!document.hasFocus() || !isPointerInWindow.current)) {
        setIsHeroTextVisible(false);
        return;
      }

      window.clearTimeout(hideHeroTextTimer.current);
      setIsHeroTextVisible(true);
      hideHeroTextTimer.current = window.setTimeout(() => setIsHeroTextVisible(false), visualizerTiming.heroTextVisibleMs);
    };

    const hideHeroText = () => {
      clearHeroTimers();
      setIsHeroTextVisible(false);
    };

    const handleWindowFocus = () => {
      isPointerInWindow.current = true;
      revealHeroText();
    };

    const handleWindowBlur = () => {
      hideHeroText();
    };

    const handlePointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      isPointerInWindow.current = true;
      if (document.hasFocus()) revealHeroText();
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      isPointerInWindow.current = false;
      hideHeroText();
    };

    const isInsideHero = (event: { clientX: number; clientY: number }) => {
      const hero = document.querySelector<HTMLElement>('.hero');
      if (!hero) return false;

      const bounds = hero.getBoundingClientRect();
      return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    };

    const beginHeroPointer = (event: PointerEvent) => {
      if (!isInsideHero(event)) return;

      heroPointerStart.current = { x: event.clientX, y: event.clientY };
      isDraggingHero.current = false;
    };

    const trackHeroPointer = (event: PointerEvent) => {
      const start = heroPointerStart.current;
      if (!start) return;

      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance < 10) return;

      isDraggingHero.current = true;
      if (isInsideHero(event)) hideHeroText();
    };

    const endHeroPointer = (event: PointerEvent) => {
      const start = heroPointerStart.current;
      if (!start) return;

      heroPointerStart.current = null;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      const isTap = distance < 10 && !isDraggingHero.current;
      isDraggingHero.current = false;

      if (isTap && isInsideHero(event)) {
        revealHeroText(true);
        return;
      }

      if (isInsideHero(event)) hideHeroText();
    };

    const handleHeroClick = (event: MouseEvent) => {
      if (isInsideHero(event)) revealHeroText(true);
    };

    const handleKeyDown = () => {
      revealHeroText(true);
    };

    revealHeroText();
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('pointerenter', handlePointerEnter);
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', beginHeroPointer, { passive: true });
    window.addEventListener('pointermove', trackHeroPointer, { passive: true });
    window.addEventListener('pointerup', endHeroPointer, { passive: true });
    window.addEventListener('pointercancel', hideHeroText, { passive: true });
    window.addEventListener('click', handleHeroClick, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearHeroTimers();
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('pointerenter', handlePointerEnter);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', beginHeroPointer);
      window.removeEventListener('pointermove', trackHeroPointer);
      window.removeEventListener('pointerup', endHeroPointer);
      window.removeEventListener('pointercancel', hideHeroText);
      window.removeEventListener('click', handleHeroClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero" aria-label={siteCopy.hero.visualizerLabel}>
        <Visualizer scene={activeScene} controlsVisible={isHeroTextVisible} />

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