// Hi-hat synthesizer using filtered noise with metallic resonances

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class HiHatSynth extends BaseDrumSynth {
  private noiseBuffer: AudioBuffer | null = null;
  private activeChokeGroup: Map<number, DrumVoice> = new Map();

  constructor(context: AudioContext) {
    super(context);
    this.createNoiseBuffer();
  }

  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 8000); // High frequency base
    this.parameters.set('decay', 0.05); // 50ms decay (closed)
    this.parameters.set('tone', 0.7); // Brightness
    this.parameters.set('color', 8000); // Filter cutoff
    this.parameters.set('metallic', 0.6); // Metallic resonance amount
    this.parameters.set('chokeGroup', 0); // Choke group
  }

  private createNoiseBuffer(): void {
    const bufferSize = this.context.sampleRate * 2;
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
    const decay = params?.decay ?? this.getParameter('decay', 0.05);
    const tone = params?.tone ?? this.getParameter('tone', 0.7);
    const color = (params as any)?.color ?? this.getParameter('color', 8000);
    const metallic = (params as any)?.metallic ?? this.getParameter('metallic', 0.6);
    const chokeGroup = (params as any)?.chokeGroup ?? this.getParameter('chokeGroup', 0);

    // Handle choke groups (stop previous hi-hat in same group)
    if (this.activeChokeGroup.has(chokeGroup)) {
      const previousVoice = this.activeChokeGroup.get(chokeGroup);
      previousVoice?.stop(time);
      this.activeChokeGroup.delete(chokeGroup);
    }

    if (!this.noiseBuffer) return;

    const nodes: AudioNode[] = [];

    // --- Main Noise Source ---
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    nodes.push(noiseSource);

    // --- Bandpass Filter 1 (Fundamental Metallic Frequency) ---
    const filter1 = this.context.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(color * 0.7, time);
    filter1.Q.setValueAtTime(20 * metallic, time);
    nodes.push(filter1);

    // --- Bandpass Filter 2 (Harmonic) ---
    const filter2 = this.context.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(color * 1.2, time);
    filter2.Q.setValueAtTime(15 * metallic, time);
    nodes.push(filter2);

    // --- Bandpass Filter 3 (Higher Harmonic) ---
    const filter3 = this.context.createBiquadFilter();
    filter3.type = 'bandpass';
    filter3.frequency.setValueAtTime(color * 1.8, time);
    filter3.Q.setValueAtTime(10 * metallic, time);
    nodes.push(filter3);

    // --- High-pass Filter (Remove low frequencies) ---
    const hpFilter = this.context.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(5000, time);
    hpFilter.Q.setValueAtTime(0.5, time);
    nodes.push(hpFilter);

    // --- Envelope ---
    const envGain = this.context.createGain();
    envGain.gain.setValueAtTime(velocity * tone, time);
    this.createEnvelope(envGain.gain, time, velocity * tone, 0.001, decay);
    nodes.push(envGain);

    // --- Output Gain ---
    const outputGain = this.context.createGain();
    outputGain.gain.setValueAtTime(0.5, time);
    nodes.push(outputGain);

    // Connect signal chain
    noiseSource.connect(filter1);
    noiseSource.connect(filter2);
    noiseSource.connect(filter3);

    filter1.connect(hpFilter);
    filter2.connect(hpFilter);
    filter3.connect(hpFilter);

    hpFilter.connect(envGain);
    envGain.connect(outputGain);
    outputGain.connect(this.outputNode);

    // Start noise
    noiseSource.start(time);

    const endTime = time + decay + 0.05;
    noiseSource.stop(endTime);

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

        // Remove from choke group if present
        if (this.activeChokeGroup.get(chokeGroup) === voice) {
          this.activeChokeGroup.delete(chokeGroup);
        }
      }
    };

    this.voices.add(voice);
    this.activeChokeGroup.set(chokeGroup, voice);

    // Auto-cleanup
    setTimeout(() => {
      if (this.voices.has(voice)) {
        voice.stop(this.context.currentTime);
      }
    }, (endTime - this.context.currentTime) * 1000 + 100);
  }
}
