// Snare drum synthesizer using filtered tone + noise burst

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class SnareSynth extends BaseDrumSynth {
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context);
    this.createNoiseBuffer();
  }

  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 200); // 200Hz body tone
    this.parameters.set('decay', 0.15); // 150ms decay
    this.parameters.set('tone', 0.5); // Body/noise balance
    this.parameters.set('bodyFreq', 250); // Body resonance frequency
    this.parameters.set('noiseLevel', 0.7); // Noise component level
    this.parameters.set('bodyDecay', 0.12); // Body decay time
    this.parameters.set('noiseDecay', 0.08); // Noise decay time
    this.parameters.set('resonance', 8); // Filter Q
  }

  /**
   * Create noise buffer for snare burst
   */
  private createNoiseBuffer(): void {
    const bufferSize = this.context.sampleRate * 2; // 2 seconds of noise
    this.noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void {
    const tone = params?.tone ?? this.getParameter('tone', 0.5);
    const bodyFreq = (params as any)?.bodyFreq ?? this.getParameter('bodyFreq', 250);
    const noiseLevel = (params as any)?.noiseLevel ?? this.getParameter('noiseLevel', 0.7);
    const bodyDecay = (params as any)?.bodyDecay ?? this.getParameter('bodyDecay', 0.12);
    const noiseDecay = (params as any)?.noiseDecay ?? this.getParameter('noiseDecay', 0.08);
    const resonance = (params as any)?.resonance ?? this.getParameter('resonance', 8);

    const nodes: AudioNode[] = [];

    // --- Body Tone (Filtered Oscillator) ---
    const bodyOsc = this.context.createOscillator();
    const bodyFilter = this.context.createBiquadFilter();
    const bodyGain = this.context.createGain();

    // Use triangle wave for snare body
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(bodyFreq, time);

    // Bandpass filter for body resonance
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(bodyFreq, time);
    bodyFilter.Q.setValueAtTime(resonance, time);

    // Body envelope
    bodyGain.gain.setValueAtTime(velocity * tone, time);
    this.createEnvelope(bodyGain.gain, time, velocity * tone, 0.001, bodyDecay);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    nodes.push(bodyOsc, bodyFilter, bodyGain);

    // --- Noise Component ---
    if (this.noiseBuffer) {
      const noiseSource = this.context.createBufferSource();
      const noiseFilter = this.context.createBiquadFilter();
      const noiseGain = this.context.createGain();

      noiseSource.buffer = this.noiseBuffer;

      // High-pass filter for noise
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(3000, time);
      noiseFilter.Q.setValueAtTime(1.0, time);

      // Noise envelope (shorter, punchier)
      noiseGain.gain.setValueAtTime(velocity * noiseLevel, time);
      this.createEnvelope(noiseGain.gain, time, velocity * noiseLevel, 0.001, noiseDecay);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      nodes.push(noiseSource, noiseFilter, noiseGain);

      // Start noise
      noiseSource.start(time);
      noiseSource.stop(time + noiseDecay + 0.1);
    }

    // --- Output Stage ---
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.7, time);
    nodes.push(masterGain);

    // Connect to output
    bodyGain.connect(masterGain);
    if (this.noiseBuffer) {
      const lastNoiseGain = nodes[nodes.length - 4] as GainNode; // noiseGain
      lastNoiseGain.connect(masterGain);
    }
    masterGain.connect(this.outputNode);

    // Start body oscillator
    bodyOsc.start(time);

    // Stop oscillators
    const endTime = time + Math.max(bodyDecay, noiseDecay) + 0.1;
    bodyOsc.stop(endTime);

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
