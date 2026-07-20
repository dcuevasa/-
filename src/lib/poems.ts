import advertenciaSolar from '../../docs/advertencia_solar.md?raw';
import cadaHora from '../../docs/cada_hora_y_un_minuto.txt?raw';
import esnupi from '../../docs/esnupi.txt?raw';
import esperando from '../../docs/esperando_1_hora.txt?raw';
import margarita from '../../docs/margarita.txt?raw';
import mypov from '../../docs/mypov.txt?raw';
import navidad from '../../docs/navidad.txt?raw';
import fresas from '../../docs/no_son_fresas.txt?raw';
import yummy from '../../docs/yummy.txt?raw';

const entries = [
  ['Advertencia solar', 'poema', advertenciaSolar],
  ['Cada hora y un minuto', 'texto', cadaHora],
  ['Esnupi', 'dibujo', esnupi],
  ['Esperando 1 hora', 'texto', esperando],
  ['Margarita', 'dibujo', margarita],
  ['Mi POV', 'texto', mypov],
  ['Navidad', 'dibujo', navidad],
  ['No son fresas', 'texto', fresas],
  ['Yummy', 'dibujo', yummy],
] as const;

function preview(content: string) {
  return content
    .replaceAll('```text', '')
    .replaceAll('```', '')
    .trim()
    .split('\n')
    .slice(0, 9)
    .join('\n');
}

export const poems = entries.map(([title, kind, content]) => ({
  title,
  kind,
  preview: preview(content),
}));