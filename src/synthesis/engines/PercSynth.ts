// Generic percussion synthesizer - tunable for various percussive sounds

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class PercSynth extends BaseDrumSynth {
  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 300); // Tunable frequency
    this.parameters.set('decay', 0.12); // 120ms decay
    this.parameters.set('tone', 0.5); // Oscillator vs noise balance
    this.parameters.set('harmonics', 2.5); // Harmonic content
    this.parameters.set('resonance', 6); // Filter resonance
  }

  trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void {
    const pitch = params?.pitch ?? this.getParameter('pitch', 300);
    const decay = params?.decay ?? this.getParameter('decay', 0.12);
    const tone = params?.tone ?? this.getParameter('tone', 0.5);
    const harmonics = (params as any)?.harmonics ?? this.getParameter('harmonics', 2.5);
    const resonance = (params as any)?.resonance ?? this.getParameter('resonance', 6);

    const nodes: AudioNode[] = [];

    // --- Tonal Component (FM-like) ---
    const osc1 = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const oscGain = this.context.createGain();

    // Primary oscillator
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(pitch, time);
    osc1.frequency.exponentialRampToValueAtTime(pitch * 0.8, time + decay * 0.3);

    // Harmonic oscillator
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(pitch * harmonics, time);

    // Mix oscillators
    const osc1Gain = this.context.createGain();
    const osc2Gain = this.context.createGain();
    osc1Gain.gain.setValueAtTime(0.6, time);
    osc2Gain.gain.setValueAtTime(0.4 * tone, time);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(oscGain);
    osc2Gain.connect(oscGain);

    nodes.push(osc1, osc2, osc1Gain, osc2Gain);

    // Filter for character
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch * 1.5, time);
    filter.Q.setValueAtTime(resonance, time);

    oscGain.connect(filter);
    nodes.push(filter);

    // Envelope
    const envGain = this.context.createGain();
    envGain.gain.setValueAtTime(velocity * tone, time);
    this.createEnvelope(envGain.gain, time, velocity * tone, 0.001, decay);

    filter.connect(envGain);
    nodes.push(envGain, oscGain);

    // --- Noise Component ---
    // Create short noise burst
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(pitch * 2, time);
    noiseFilter.Q.setValueAtTime(2.0, time);

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(velocity * (1 - tone) * 0.3, time);
    this.createEnvelope(noiseGain.gain, time, velocity * (1 - tone) * 0.3, 0.001, decay * 0.5);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    nodes.push(noiseSource, noiseFilter, noiseGain);

    // --- Output Stage ---
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.7, time);
    nodes.push(masterGain);

    envGain.connect(masterGain);
    noiseGain.connect(masterGain);
    masterGain.connect(this.outputNode);

    // Start sources
    osc1.start(time);
    osc2.start(time);
    noiseSource.start(time);

    const endTime = time + decay + 0.05;
    osc1.stop(endTime);
    osc2.stop(endTime);
    noiseSource.stop(time + decay * 0.5 + 0.05);

    // Create voice object
    const voice: DrumVoice = {
      nodes,
      startTime: time,
      endTime,
      stop: (stopTime: number) => {
        nodes.forEach(node => {
          if (node instanceof AudioScheduledSourceNode) {
            try {
              node.stop(stopTime);
            } catch (e) {
              // Already stopped
            }
          }
          node.disconnect();
        });
        this.voices.delete(voice);
      }
    };

    this.voices.add(voice);

    // Auto-cleanup
    setTimeout(() => {
      if (this.voices.has(voice)) {
        voice.stop(this.context.currentTime);
      }
    }, (endTime - this.context.currentTime) * 1000 + 100);
  }
}
