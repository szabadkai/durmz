// Rimshot synthesizer using filtered oscillator with metallic resonance

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class RimSynth extends BaseDrumSynth {
  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 400); // Fundamental frequency
    this.parameters.set('decay', 0.08); // 80ms decay
    this.parameters.set('tone', 0.7); // Metallic character
    this.parameters.set('resonance', 12); // High Q for metallic sound
    this.parameters.set('noiseLevel', 0.3); // Click/noise component
  }

  trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void {
    const pitch = params?.pitch ?? this.getParameter('pitch', 400);
    const decay = params?.decay ?? this.getParameter('decay', 0.08);
    const tone = params?.tone ?? this.getParameter('tone', 0.7);
    const resonance = (params as any)?.resonance ?? this.getParameter('resonance', 12);
    const noiseLevel = (params as any)?.noiseLevel ?? this.getParameter('noiseLevel', 0.3);

    const nodes: AudioNode[] = [];

    // --- Metallic Tone (High-Q Filtered Oscillator) ---
    const osc = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const oscGain = this.context.createGain();

    // Square wave for metallic character
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, time);

    // High-Q bandpass for rimshot character
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch * 2, time);
    filter.Q.setValueAtTime(resonance * tone, time);

    // Fast envelope
    oscGain.gain.setValueAtTime(velocity * 0.6, time);
    this.createEnvelope(oscGain.gain, time, velocity * 0.6, 0.001, decay);

    osc.connect(filter);
    filter.connect(oscGain);
    nodes.push(osc, filter, oscGain);

    // --- Click/Noise Component ---
    const clickOsc = this.context.createOscillator();
    const clickFilter = this.context.createBiquadFilter();
    const clickGain = this.context.createGain();

    clickOsc.type = 'sawtooth';
    clickOsc.frequency.setValueAtTime(pitch * 6, time);
    clickOsc.frequency.exponentialRampToValueAtTime(pitch * 2, time + 0.01);

    clickFilter.type = 'highpass';
    clickFilter.frequency.setValueAtTime(2000, time);
    clickFilter.Q.setValueAtTime(0.5, time);

    // Very short click envelope
    clickGain.gain.setValueAtTime(velocity * noiseLevel, time);
    this.createEnvelope(clickGain.gain, time, velocity * noiseLevel, 0.001, 0.02);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    nodes.push(clickOsc, clickFilter, clickGain);

    // --- Output Stage ---
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.8, time);
    nodes.push(masterGain);

    oscGain.connect(masterGain);
    clickGain.connect(masterGain);
    masterGain.connect(this.outputNode);

    // Start oscillators
    osc.start(time);
    clickOsc.start(time);

    const endTime = time + decay + 0.05;
    osc.stop(endTime);
    clickOsc.stop(endTime);

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
