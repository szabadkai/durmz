// Tom synthesizer using tuned oscillator with pitch envelope

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class TomSynth extends BaseDrumSynth {
  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 150); // Base pitch (can be tuned)
    this.parameters.set('decay', 0.4); // 400ms decay
    this.parameters.set('tone', 0.5); // Tone color
    this.parameters.set('pitchDecay', 0.08); // Pitch envelope time
    this.parameters.set('pitchAmount', 2.5); // Pitch envelope multiplier
    this.parameters.set('resonance', 4); // Body resonance
  }

  trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void {
    const pitch = params?.pitch ?? this.getParameter('pitch', 150);
    const decay = params?.decay ?? this.getParameter('decay', 0.4);
    const tone = params?.tone ?? this.getParameter('tone', 0.5);
    const pitchDecay = (params as any)?.pitchDecay ?? this.getParameter('pitchDecay', 0.08);
    const pitchAmount = (params as any)?.pitchAmount ?? this.getParameter('pitchAmount', 2.5);
    const resonance = (params as any)?.resonance ?? this.getParameter('resonance', 4);

    const nodes: AudioNode[] = [];

    // --- Tom Body (Pitched Oscillator) ---
    const bodyOsc = this.context.createOscillator();
    const bodyFilter = this.context.createBiquadFilter();
    const bodyGain = this.context.createGain();

    // Sine wave for tom body
    bodyOsc.type = 'sine';

    // Pitch envelope - start higher and drop to fundamental
    const startPitch = pitch * pitchAmount;
    bodyOsc.frequency.setValueAtTime(startPitch, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(pitch, time + pitchDecay);

    // Lowpass filter for body resonance
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(pitch * 4, time);
    bodyFilter.Q.setValueAtTime(resonance, time);

    // Envelope
    bodyGain.gain.setValueAtTime(velocity, time);
    this.createEnvelope(bodyGain.gain, time, velocity, 0.001, decay);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    nodes.push(bodyOsc, bodyFilter, bodyGain);

    // --- Attack Component (Triangle Wave) ---
    const attackOsc = this.context.createOscillator();
    const attackFilter = this.context.createBiquadFilter();
    const attackGain = this.context.createGain();

    attackOsc.type = 'triangle';
    attackOsc.frequency.setValueAtTime(pitch * 2, time);

    attackFilter.type = 'highpass';
    attackFilter.frequency.setValueAtTime(200, time);
    attackFilter.Q.setValueAtTime(1.0, time);

    // Very short attack envelope
    attackGain.gain.setValueAtTime(velocity * tone * 0.4, time);
    this.createEnvelope(attackGain.gain, time, velocity * tone * 0.4, 0.001, 0.05);

    attackOsc.connect(attackFilter);
    attackFilter.connect(attackGain);
    nodes.push(attackOsc, attackFilter, attackGain);

    // --- Output Stage ---
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.9, time);
    nodes.push(masterGain);

    bodyGain.connect(masterGain);
    attackGain.connect(masterGain);
    masterGain.connect(this.outputNode);

    // Start oscillators
    bodyOsc.start(time);
    attackOsc.start(time);

    const endTime = time + decay + 0.1;
    bodyOsc.stop(endTime);
    attackOsc.stop(endTime);

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
