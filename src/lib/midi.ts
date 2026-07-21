export type MidiNote = {
  start: number;
  duration: number;
  midi: number;
  velocity: number;
  channel: number;
};

export type ParsedMidi = {
  title: string;
  duration: number;
  notes: MidiNote[];
};

type TempoEvent = {
  tick: number;
  microsecondsPerQuarter: number;
};

type RawNote = {
  startTick: number;
  endTick: number;
  midi: number;
  velocity: number;
  channel: number;
};

const DEFAULT_TEMPO = 500000;

function readAscii(view: DataView, offset: number, length: number) {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}

function readVariableLength(view: DataView, offset: number) {
  let value = 0;
  let cursor = offset;
  let byte = 0;

  do {
    byte = view.getUint8(cursor);
    cursor += 1;
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);

  return { value, offset: cursor };
}

function tickToSeconds(tick: number, tempoEvents: TempoEvent[], ticksPerQuarter: number) {
  let seconds = 0;
  let previousTick = 0;
  let tempo = DEFAULT_TEMPO;

  for (const event of tempoEvents) {
    if (event.tick > tick) break;
    seconds += ((event.tick - previousTick) * tempo) / ticksPerQuarter / 1000000;
    previousTick = event.tick;
    tempo = event.microsecondsPerQuarter;
  }

  seconds += ((tick - previousTick) * tempo) / ticksPerQuarter / 1000000;
  return seconds;
}

function parseTrack(view: DataView, start: number, end: number, rawNotes: RawNote[], tempoEvents: TempoEvent[]) {
  const openNotes = new Map<string, RawNote[]>();
  let offset = start;
  let tick = 0;
  let runningStatus = 0;

  while (offset < end) {
    const delta = readVariableLength(view, offset);
    tick += delta.value;
    offset = delta.offset;

    let status = view.getUint8(offset);
    if (status & 0x80) {
      offset += 1;
      runningStatus = status;
    } else {
      status = runningStatus;
    }

    if (status === 0xff) {
      const metaType = view.getUint8(offset);
      offset += 1;
      const length = readVariableLength(view, offset);
      offset = length.offset;

      if (metaType === 0x51 && length.value === 3) {
        const microsecondsPerQuarter = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
        tempoEvents.push({ tick, microsecondsPerQuarter });
      }

      offset += length.value;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      const length = readVariableLength(view, offset);
      offset = length.offset + length.value;
      continue;
    }

    const command = status & 0xf0;
    const channel = status & 0x0f;
    const first = view.getUint8(offset);
    offset += 1;
    const hasSecondByte = command !== 0xc0 && command !== 0xd0;
    const second = hasSecondByte ? view.getUint8(offset) : 0;
    if (hasSecondByte) offset += 1;

    if (command !== 0x80 && command !== 0x90) continue;

    const key = `${channel}:${first}`;
    if (command === 0x90 && second > 0) {
      const note: RawNote = { startTick: tick, endTick: tick, midi: first, velocity: second / 127, channel };
      const notes = openNotes.get(key) ?? [];
      notes.push(note);
      openNotes.set(key, notes);
      rawNotes.push(note);
      continue;
    }

    const notes = openNotes.get(key);
    const note = notes?.shift();
    if (note) note.endTick = Math.max(tick, note.startTick + 1);
  }
}

export function parseMidi(arrayBuffer: ArrayBuffer, title: string): ParsedMidi {
  const view = new DataView(arrayBuffer);
  if (readAscii(view, 0, 4) !== 'MThd') {
    throw new Error('Invalid MIDI header');
  }

  const headerLength = view.getUint32(4);
  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);
  if (division & 0x8000) {
    throw new Error('SMPTE MIDI timing is not supported');
  }

  const ticksPerQuarter = division;
  let offset = 8 + headerLength;
  const rawNotes: RawNote[] = [];
  const tempoEvents: TempoEvent[] = [{ tick: 0, microsecondsPerQuarter: DEFAULT_TEMPO }];

  for (let trackIndex = 0; trackIndex < trackCount && offset < view.byteLength; trackIndex += 1) {
    if (readAscii(view, offset, 4) !== 'MTrk') break;
    const length = view.getUint32(offset + 4);
    const trackStart = offset + 8;
    const trackEnd = trackStart + length;
    parseTrack(view, trackStart, trackEnd, rawNotes, tempoEvents);
    offset = trackEnd;
  }

  tempoEvents.sort((left, right) => left.tick - right.tick);
  const notes = rawNotes
    .filter((note) => note.endTick > note.startTick)
    .map((note) => {
      const start = tickToSeconds(note.startTick, tempoEvents, ticksPerQuarter);
      const end = tickToSeconds(note.endTick, tempoEvents, ticksPerQuarter);
      return {
        start,
        duration: Math.max(0.08, end - start),
        midi: note.midi,
        velocity: note.velocity,
        channel: note.channel,
      };
    })
    .sort((left, right) => left.start - right.start);

  const duration = notes.reduce((maxDuration, note) => Math.max(maxDuration, note.start + note.duration), 0);
  return { title, duration, notes };
}

export function midiFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}
