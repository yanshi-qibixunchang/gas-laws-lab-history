import type { PistonReboundSound } from './pistonOscillationAudioPolicy.ts';

const raisedCosine = (position: number) => (1 - Math.cos(Math.PI * position)) / 2;

const resizeRecording = (
  source: Float32Array,
  targetLength: number,
  sampleRate: number,
  attackMs: number,
  tailStartMs: number,
) => {
  if (source.length === targetLength) return source;
  // The browser's WAV resampler can round the decoded length down by one frame.
  if (source.length === targetLength - 1) {
    const padded = new Float32Array(targetLength);
    padded.set(source);
    return padded;
  }
  const samplesFor = (milliseconds: number) => Math.round(sampleRate * milliseconds / 1000);
  const result = new Float32Array(targetLength);
  const attack = Math.min(samplesFor(attackMs), Math.floor(targetLength * 0.4));
  const tailStart = samplesFor(tailStartMs);
  const tailLength = Math.min(source.length - tailStart, Math.floor(targetLength * 0.32));
  const overlap = Math.max(2, Math.min(samplesFor(8), Math.floor(attack / 2), Math.floor(tailLength / 2)));
  const frame = samplesFor(40);
  const search = samplesFor(12);
  const tailAt = targetLength - tailLength;
  const blendSample = (offset: number, value: number, index: number) => {
    const weight = index < overlap ? raisedCosine(index / (overlap - 1)) : 1;
    result[offset] = (1 - weight) * result[offset]! + weight * value;
  };

  result.set(source.subarray(0, attack));
  for (let offset = attack - overlap; offset < tailAt - overlap; offset += frame - overlap) {
    const length = Math.min(frame, tailAt - offset);
    const progress = (offset - attack + overlap) / (tailAt - attack);
    const desiredStart = Math.round(attack - overlap + progress * (tailStart - attack + overlap - length));
    const first = Math.max(attack - overlap, desiredStart - search);
    const last = Math.min(tailStart - length, desiredStart + search);
    let bestStart = first;
    let bestScore = -Infinity;
    // Align the crossings in the overlap while keeping the grains close to their intended place.
    for (let start = first; start <= last; start++) {
      let dot = 0;
      let energy = 0;
      for (let index = 0; index < overlap; index += 2) {
        const value = source[start + index]!;
        dot += result[offset + index]! * value;
        energy += value * value;
      }
      const score = dot / Math.sqrt(energy + 1e-10) * (1 - 0.2 * Math.abs(start - desiredStart) / search);
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
      }
    }
    for (let index = 0; index < length; index++) {
      blendSample(offset + index, source[bestStart + index]!, index);
    }
  }
  for (let index = 0; index < tailLength + overlap; index++) {
    blendSample(tailAt - overlap + index, source[tailStart - overlap + index]!, index);
  }
  for (let index = 0; index < overlap; index++) {
    result[targetLength - 1 - index]! *= raisedCosine(index / (overlap - 1));
  }
  return result;
};

export const renderPistonReboundRecording = (
  context: AudioContext,
  recordings: readonly AudioBuffer[],
  { durationMs, severity }: PistonReboundSound,
) => {
  const [synchronized, staggered] = recordings;
  const { sampleRate } = context;
  const length = Math.max(8, Math.round(durationMs * sampleRate / 1000));
  const output = context.createBuffer(1, length, sampleRate);
  const samples = output.getChannelData(0);
  if (severity < 1) {
    const recording = resizeRecording(synchronized!.getChannelData(0), length, sampleRate, 47, 308);
    samples.set(recording);
  }
  if (severity > 0) {
    const recording = resizeRecording(staggered!.getChannelData(0), length, sampleRate, 57, 164);
    for (let index = 0; index < length; index++) {
      samples[index] = (1 - severity) * samples[index]! + severity * recording[index]!;
    }
  }
  return output;
};
