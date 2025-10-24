// Clap synthesizer using layered noise bursts with timing offsets

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class ClapSynth extends BaseDrumSynth {
  private noiseBuffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    super(context);
    this.createNoiseBuffer();
  }

  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 1000); // Filter frequency
    this.parameters.set('decay', 0.1); // 100ms decay
    this.parameters.set('tone', 0.6); // Brightness
    this.parameters.set('layers', 3); // Number of clap layers
    this.parameters.set('spread', 0.02); // Time spread between layers (20ms)
    this.parameters.set('resonance', 2); // Filter resonance
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
    const pitch = params?.pitch ?? this.getParameter('pitch', 1000);
    const decay = params?.decay ?? this.getParameter('decay', 0.1);
    const tone = params?.tone ?? this.getParameter('tone', 0.6);
    const layers = (params as any)?.layers ?? this.getParameter('layers', 3);
    const spread = (params as any)?.spread ?? this.getParameter('spread', 0.02);
    const resonance = (params as any)?.resonance ?? this.getParameter('resonance', 2);

    if (!this.noiseBuffer) return;

    const nodes: AudioNode[] = [];
    const layerCount = Math.floor(layers);

    // Create multiple noise burst layers with slight timing offsets
    for (let i = 0; i < layerCount; i++) {
      const layerTime = time + (i * spread);
      const layerVelocity = velocity * (0.7 + i * 0.15); // Each layer slightly louder

      // Noise source
      const noiseSource = this.context.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      // Bandpass filter for clap character
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(pitch * tone, layerTime);
      filter.Q.setValueAtTime(resonance, layerTime);

      // Envelope
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(layerVelocity * 0.8, layerTime);

      // Fast attack, quick decay
      const layerDecay = decay * (0.8 + i * 0.1); // Later layers decay slightly longer
      this.createEnvelope(gain.gain, layerTime, layerVelocity * 0.8, 0.001, layerDecay);

      // Connect chain
      noiseSource.connect(filter);
      filter.connect(gain);
      nodes.push(noiseSource, filter, gain);

      // Start and stop
      noiseSource.start(layerTime);
      noiseSource.stop(layerTime + layerDecay + 0.05);
    }

    // Output gain
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.7, time);
    nodes.push(masterGain);

    // Connect all layers to master
    nodes.forEach(node => {
      if (node instanceof GainNode && node !== masterGain) {
        node.connect(masterGain);
      }
    });

    masterGain.connect(this.outputNode);

    const endTime = time + decay + spread * layerCount + 0.1;

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
