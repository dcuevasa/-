import { BookOpen, Clapperboard, Flower2, Shell, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Visualizer } from './components/Visualizer';
import { poems } from './lib/poems';
import { scenes } from './visuals/scenes';

const sceneIcons = {
  octopus: Shell,
  daisies: Flower2,
  pages: BookOpen,
  film: Clapperboard,
};

export function App() {
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];

  return (
    <main className="app-shell">
      <section className="hero" aria-label="Visualizador principal">
        <Visualizer scene={activeScene} />

        <div className="hero-content">
          <p className="eyebrow">Un cielo privado para mirar despacio</p>
          <h1>Cosas que te gustan, moviendose como si supieran tu nombre.</h1>
          <p className="intro">
            Pulpos, margaritas, paginas y pelicula viva en una ventana que se puede seguir ampliando con nuevas escenas.
          </p>
        </div>

        <nav className="scene-dock" aria-label="Cambiar visualizacion">
          {scenes.map((scene) => {
            const Icon = sceneIcons[scene.id];
            const isActive = scene.id === activeScene.id;

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

      <section className="note-band" aria-label="Dedicatoria">
        <div>
          <Sparkles aria-hidden="true" size={22} />
          <p>
            La primera vista es el visualizador. Cada escena vive en un registro limpio para que despues puedas sumar otra cosa que le guste sin rehacer la pagina.
          </p>
        </div>
      </section>

      <section className="poem-section" aria-label="Dibujos y poemas guardados">
        <div className="section-heading">
          <p className="eyebrow">Archivo compartido</p>
          <h2>Dibujos y textos que ya estaban aqui</h2>
        </div>

        <div className="poem-grid">
          {poems.map((poem) => (
            <article className="poem-card" key={poem.title}>
              <p>{poem.kind}</p>
              <h3>{poem.title}</h3>
              <pre>{poem.preview}</pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}