# 🐮
## Requisitos

- Node.js 24 o superior.
- npm 11 o superior.
- Git, si vas a publicar cambios en GitHub.

Puedes comprobar tus versiones con:

```bash
node --version
npm --version
```

## Instalar dependencias

Desde la raiz del repositorio:

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Vite mostrara una URL local parecida a:

```text
http://localhost:5173/
```

Abre esa URL en el navegador para ver la pagina. Si estas en un dev container o Codespaces, usa el puerto reenviado que muestre VS Code.

## Construir la version de produccion

```bash
npm run build
```

El resultado queda en `dist/`. Este comando tambien ejecuta TypeScript, asi que sirve para detectar errores antes de subir cambios.

## Previsualizar el build

Despues de construir:

```bash
npm run preview
```

Esto sirve para revisar localmente la version ya empaquetada que se publicaria.

## Despliegue en GitHub Pages

El codigo fuente de la aplicacion vive en la rama `react-app`. Cada push a esa rama activa el workflow:

```text
.github/workflows/deploy.yml
```

El workflow hace lo siguiente:

1. Instala dependencias con `npm ci`.
2. Ejecuta `npm run build`.
3. Publica el contenido de `dist/` en la rama `gh-pages`.

La pagina publicada queda disponible en:

```text
https://dcuevasa.github.io/-/
```

## Flujo recomendado para cambios

```bash
git switch react-app
npm install
npm run dev
```

Haz los cambios, valida con:

```bash
npm run build
```

Luego sube la rama:

```bash
git add -A
git commit -m "Describe el cambio"
git push
```

Cuando el push llegue a GitHub, Actions actualizara automaticamente `gh-pages`.

## Modificar textos y tiempos

Los textos visibles de la pagina y los tiempos principales del visualizador estan centralizados en:

```text
src/siteConfig.ts
```

Edita `siteCopy` para cambiar titulos, subtitulos y labels. Para ocultar la intro de la vista principal, cambia `siteCopy.hero.showIntro` a `false`. Edita `visualizerTiming` para ajustar cuanto tiempo aparece el texto, cuanto tarda en reaparecer tras inactividad, cuanto movimiento continuo oculta la UI y como se suaviza el movimiento del puntero.

## Agregar dibujos o textos

Los documentos se cargan automaticamente segun la carpeta donde esten:

```text
docs/dibujo/  Dibujos y arte ASCII
docs/texto/   Poemas y textos
```

Puedes agregar archivos `.md` o `.txt`. La carpeta define si se muestra como `dibujo` o `texto`, y la extension define si se renderiza como Markdown o texto preformateado.

## Agregar una nueva visualizacion

Cada visualizacion vive en su propio modulo dentro de:

```text
src/visuals/scenes/
```

Para sumar una escena nueva:

1. Crea un archivo nuevo, por ejemplo `src/visuals/scenes/constellations.ts`.
2. Exporta un `SceneDefinition` con `id`, `title`, `description`, `Icon` y `create`.
3. La funcion `create` debe devolver un `SceneRuntime` con un metodo `render`; si la escena necesita estado interno, guardalo dentro de ese modulo.
4. Agrega el nuevo id al tipo `SceneId` en `src/visuals/types.ts`.
5. Registra la escena en `src/visuals/registry.ts`.

## Estructura principal

```text
src/App.tsx                   Pantalla principal y controles de escenas
src/components/Visualizer.tsx Canvas animado reutilizable
src/visuals/types.ts          Contratos compartidos de escenas
src/visuals/registry.ts       Registro central de visualizaciones
src/visuals/scenes/           Modulos independientes de cada escena
src/visuals/utils/            Utilidades de Canvas y movimiento
src/lib/documents.ts          Carga automatica de docs/dibujo y docs/texto
src/siteConfig.ts             Textos visibles y tiempos editables
src/styles.css                Estilos globales
docs/                         Dibujos y poemas originales
```