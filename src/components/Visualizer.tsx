import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { midiFrequency, parseMidi, type MidiNote, type ParsedMidi } from '../lib/midi';
import { visualizerFeatures, visualizerTiming } from '../siteConfig';
import type { SceneDefinition } from '../visuals/registry';

type VisualizerProps = {
  scene: SceneDefinition;
  controlsVisible: boolean;
};

type MidiTrack = {
  title: string;
  url: string;
};

type ScheduledNote = {
  oscillators: OscillatorNode[];
  gain: GainNode;
};

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const midiModules = import.meta.glob('../../docs/midi/*.mid', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const midiTracks: MidiTrack[] = Object.entries(midiModules)
  .map(([path, url]) => ({
    title: (path.split('/').at(-1) ?? 'cancion.mid').replace(/\.mid$/i, ''),
    url,
  }))
  .sort((left, right) => left.title.localeCompare(right.title));

const scheduleAheadSeconds = 0.45;
const schedulerIntervalMs = 90;

function getMirrorHour(date: Date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return hours === minutes ? `${hours}:${minutes}` : null;
}

function noteEnergy(notes: MidiNote[], position: number) {
  let energy = 0;
  for (const note of notes) {
    const distance = Math.abs(note.start - position);
    if (distance > 0.16) continue;
    energy = Math.max(energy, note.velocity * (1 - distance / 0.16));
  }

  return energy;
}

function stopScheduledNotes(notes: ScheduledNote[]) {
  for (const note of notes) {
    try {
      note.gain.gain.cancelScheduledValues(0);
      note.gain.gain.value = 0;
      note.oscillators.forEach((oscillator) => oscillator.stop());
    } catch {
      // The node may already have finished naturally.
    }
  }
  notes.length = 0;
}

function scheduleMusicBoxNote(audioContext: AudioContext, note: MidiNote, startTime: number) {
  const isPercussion = note.channel === 9;
  const duration = isPercussion ? 0.42 : Math.min(Math.max(note.duration, 0.95), 2.6);
  const gain = audioContext.createGain();
  const oscillators: OscillatorNode[] = [];
  const peakGain = isPercussion ? Math.min(0.16, 0.05 + note.velocity * 0.12) : Math.min(0.26, 0.1 + note.velocity * 0.17);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.007);
  gain.gain.exponentialRampToValueAtTime(peakGain * (isPercussion ? 0.18 : 0.34), startTime + (isPercussion ? 0.055 : 0.16));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const addPartial = (frequency: number, type: OscillatorType, level: number, detune = 0) => {
    const oscillator = audioContext.createOscillator();
    const partialGain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime(detune, startTime);
    partialGain.gain.setValueAtTime(level, startTime);
    oscillator.connect(partialGain).connect(gain).connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
    oscillators.push(oscillator);
  };

  if (isPercussion) {
    const isLowHit = note.midi <= 38;
    const baseMidi = isLowHit ? 48 : 76 + (note.midi % 7);
    const frequency = midiFrequency(baseMidi);
    addPartial(frequency, isLowHit ? 'triangle' : 'sine', isLowHit ? 0.7 : 0.55);
    addPartial(frequency * (isLowHit ? 0.5 : 2.02), 'sine', isLowHit ? 0.5 : 0.24);
    addPartial(frequency * 3.01, 'sine', 0.1, 5);
  } else {
    const frequency = midiFrequency(note.midi);
    const liftedFrequency = note.midi < 48 ? frequency * 2 : frequency;
    addPartial(liftedFrequency, 'triangle', 0.72);
    addPartial(liftedFrequency * 2.01, 'sine', 0.28, 3);
    addPartial(liftedFrequency * 3.02, 'sine', 0.13, -4);
    if (note.midi < 64) {
      addPartial(frequency, 'sine', 0.28);
      addPartial(frequency * 0.5, 'sine', 0.12);
    } else {
      addPartial(liftedFrequency * 0.5, 'sine', 0.08);
    }
  }

  return { oscillators, gain };
}

export function Visualizer({ scene, controlsVisible }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, dx: 0, dy: 0, active: false });
  const musicRef = useRef({ active: false, energy: 0, beat: 0 });
  const parsedTracksRef = useRef(new Map<number, ParsedMidi>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | undefined>(undefined);
  const playbackStartRef = useRef(0);
  const nextNoteIndexRef = useRef(0);
  const scheduledNotesRef = useRef<ScheduledNote[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMidiPlaying, setIsMidiPlaying] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [testSpecialEvent, setTestSpecialEvent] = useState<string | null>(null);
  const testSpecialEventRef = useRef<string | null>(null);
  const currentTrack = midiTracks[currentTrackIndex] ?? midiTracks[0];

  const loadTrack = async (trackIndex: number) => {
    const cachedTrack = parsedTracksRef.current.get(trackIndex);
    if (cachedTrack) return cachedTrack;

    const track = midiTracks[trackIndex];
    if (!track) throw new Error('No hay canciones MIDI disponibles');
    const response = await fetch(track.url);
    if (!response.ok) throw new Error('No se pudo cargar el MIDI');
    const parsedTrack = parseMidi(await response.arrayBuffer(), track.title);
    parsedTracksRef.current.set(trackIndex, parsedTrack);
    return parsedTrack;
  };

  const stopMidi = () => {
    window.clearInterval(schedulerRef.current);
    schedulerRef.current = undefined;
    stopScheduledNotes(scheduledNotesRef.current);
    musicRef.current = { active: false, energy: 0, beat: 0 };
    setIsMidiPlaying(false);
  };

  const playMidi = async (trackIndex = currentTrackIndex) => {
    try {
      const parsedTrack = await loadTrack(trackIndex);
      const audioWindow = window as AudioWindow;
      const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextConstructor) throw new Error('Web Audio is not supported');
      const audioContext = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      stopMidi();
      setMidiError(null);
      setCurrentTrackIndex(trackIndex);
      setIsMidiPlaying(true);
      musicRef.current = { active: true, energy: 0, beat: 0 };
      playbackStartRef.current = audioContext.currentTime;
      nextNoteIndexRef.current = 0;

      const schedule = () => {
        const position = audioContext.currentTime - playbackStartRef.current;
        musicRef.current = {
          active: true,
          energy: Math.max(noteEnergy(parsedTrack.notes, position), musicRef.current.energy * 0.88),
          beat: Math.sin(position * Math.PI * 2 * 2.1) * 0.5 + 0.5,
        };

        while (nextNoteIndexRef.current < parsedTrack.notes.length && parsedTrack.notes[nextNoteIndexRef.current].start < position + scheduleAheadSeconds) {
          const note = parsedTrack.notes[nextNoteIndexRef.current];
          nextNoteIndexRef.current += 1;
          if (note.channel !== 9 && (note.midi < 30 || note.midi > 100)) continue;

          const startTime = playbackStartRef.current + note.start;
          scheduledNotesRef.current.push(scheduleMusicBoxNote(audioContext, note, startTime));
        }

        scheduledNotesRef.current = scheduledNotesRef.current.filter((note) => {
          try {
            return note.gain.gain.value > 0;
          } catch {
            return false;
          }
        });

        if (position > parsedTrack.duration + 0.5) {
          const nextTrackIndex = (trackIndex + 1) % midiTracks.length;
          void playMidi(nextTrackIndex);
        }
      };

      schedule();
      schedulerRef.current = window.setInterval(schedule, schedulerIntervalMs);
    } catch {
      stopMidi();
      setMidiError('No se pudo reproducir el MIDI');
    }
  };

  const playPreviousTrack = () => {
    const previousTrackIndex = (currentTrackIndex - 1 + midiTracks.length) % midiTracks.length;
    if (isMidiPlaying) void playMidi(previousTrackIndex);
    else setCurrentTrackIndex(previousTrackIndex);
  };

  const playNextTrack = () => {
    const nextTrackIndex = (currentTrackIndex + 1) % midiTracks.length;
    if (isMidiPlaying) void playMidi(nextTrackIndex);
    else setCurrentTrackIndex(nextTrackIndex);
  };

  useEffect(() => {
    testSpecialEventRef.current = testSpecialEvent;
  }, [testSpecialEvent]);

  useEffect(() => stopMidi, []);

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
      const specialEventLabel = testSpecialEventRef.current ?? getMirrorHour(new Date());
      const music = musicRef.current;
      runtime.render({
        context,
        time: seconds,
        delta,
        width: rect.width,
        height: rect.height,
        pointer: pointerRef.current,
        music,
        specialEvent: { active: Boolean(specialEventLabel), label: specialEventLabel },
      });
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

  return (
    <>
      <canvas ref={canvasRef} className="visualizer" aria-label={scene.description} />
      <div className={controlsVisible ? 'midi-player is-visible' : 'midi-player'} aria-label="Reproductor MIDI">
        <div className="midi-track">
          <span>{currentTrack?.title ?? 'Sin canciones'}</span>
          {midiError ? <small>{midiError}</small> : <small>{isMidiPlaying ? 'sonando' : 'pausado'}</small>}
        </div>
        <div className="midi-controls">
          <button type="button" onClick={playPreviousTrack} aria-label="Cancion anterior">
            <SkipBack aria-hidden="true" size={16} strokeWidth={2.2} />
          </button>
          <button type="button" onClick={() => (isMidiPlaying ? stopMidi() : void playMidi())} aria-label={isMidiPlaying ? 'Pausar MIDI' : 'Reproducir MIDI'}>
            {isMidiPlaying ? <Pause aria-hidden="true" size={16} strokeWidth={2.2} /> : <Play aria-hidden="true" size={16} strokeWidth={2.2} />}
          </button>
          <button type="button" onClick={playNextTrack} aria-label="Siguiente cancion">
            <SkipForward aria-hidden="true" size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {visualizerFeatures.showSpecialEventTestButton ? (
        <button className="special-event-test" type="button" onClick={() => setTestSpecialEvent((current) => (current ? null : '11:11'))}>
          {testSpecialEvent ? 'Ocultar evento especial' : 'Probar evento especial'}
        </button>
      ) : null}
    </>
  );
}