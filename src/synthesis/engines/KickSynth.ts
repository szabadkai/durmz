// Kick drum synthesizer using sub oscillator + click oscillator

import { BaseDrumSynth, DrumVoice } from './BaseDrumSynth';
import { SynthParameters } from '../../types/pattern';

export class KickSynth extends BaseDrumSynth {
  protected initializeDefaultParameters(): void {
    this.parameters.set('pitch', 60); // 60Hz fundamental
    this.parameters.set('decay', 0.5); // 500ms decay
    this.parameters.set('tone', 0.5); // Tone/click balance
    this.parameters.set('subLevel', 0.8); // Sub oscillator level
    this.parameters.set('clickLevel', 0.3); // Click oscillator level
    this.parameters.set('pitchDecay', 0.05); // Pitch envelope time
    this.parameters.set('saturation', 0.3); // Saturation amount
  }

  trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void {
    // Merge provided parameters with defaults
    const pitch = params?.pitch ?? this.getParameter('pitch', 60);
    const decay = params?.decay ?? this.getParameter('decay', 0.5);
    const tone = params?.tone ?? this.getParameter('tone', 0.5);
    const subLevel = (params as any)?.subLevel ?? this.getParameter('subLevel', 0.8);
    const clickLevel = (params as any)?.clickLevel ?? this.getParameter('clickLevel', 0.3);
    const pitchDecay = (params as any)?.pitchDecay ?? this.getParameter('pitchDecay', 0.05);
    const saturation = (params as any)?.saturation ?? this.getParameter('saturation', 0.3);

    // Create voice nodes
    const nodes: AudioNode[] = [];

    // --- Sub Oscillator (Main Body) ---
    const subOsc = this.context.createOscillator();
    const subGain = this.context.createGain();

    // Pitch envelope: start high and drop to fundamental
    const startPitch = pitch * 2.5; // Start 2.5x higher
    subOsc.frequency.setValueAtTime(startPitch, time);
    subOsc.frequency.exponentialRampToValueAtTime(pitch, time + pitchDecay);

    subOsc.type = 'sine';
    subGain.gain.setValueAtTime(subLevel * velocity, time);
    this.createEnvelope(subGain.gain, time, subLevel * velocity, 0.001, decay);

    subOsc.connect(subGain);
    nodes.push(subOsc, subGain);

    // --- Click Oscillator (Attack Transient) ---
    const clickOsc = this.context.createOscillator();
    const clickGain = this.context.createGain();
    const clickFilter = this.context.createBiquadFilter();

    clickOsc.frequency.setValueAtTime(pitch * 8, time);
    clickOsc.frequency.exponentialRampToValueAtTime(pitch * 2, time + 0.01);
    clickOsc.type = 'sine';

    clickFilter.type = 'highpass';
    clickFilter.frequency.setValueAtTime(1000, time);
    clickFilter.Q.setValueAtTime(1.0, time);

    clickGain.gain.setValueAtTime(clickLevel * velocity * tone, time);
    this.createEnvelope(clickGain.gain, time, clickLevel * velocity * tone, 0.001, 0.05);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    nodes.push(clickOsc, clickFilter, clickGain);

    // --- Saturation/Waveshaping ---
    const saturationNode = this.context.createWaveShaper();
    saturationNode.curve = this.createSaturationCurve(saturation);
    saturationNode.oversample = '2x';
    nodes.push(saturationNode);

    // --- Output Stage ---
    const masterGain = this.context.createGain();
    masterGain.gain.setValueAtTime(0.8, time);
    nodes.push(masterGain);

    // Connect signal chain
    subGain.connect(saturationNode);
    clickGain.connect(saturationNode);
    saturationNode.connect(masterGain);
    masterGain.connect(this.outputNode);

    // Start oscillators
    subOsc.start(time);
    clickOsc.start(time);

    // Stop and clean up
    const endTime = time + decay + 0.1;
    subOsc.stop(endTime);
    clickOsc.stop(endTime);

    // Create voice object for tracking
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

    // Auto-cleanup after sound completes
    setTimeout(() => {
      if (this.voices.has(voice)) {
        voice.stop(this.context.currentTime);
      }
    }, (endTime - this.context.currentTime) * 1000 + 100);
  }

  /**
   * Create saturation curve for waveshaper
   */
  private createSaturationCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 4096;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array<ArrayBuffer>(buffer);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const k = amount * 100;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      curve[i] = Math.max(-1, Math.min(1, curve[i])); // Clamp
    }

    return curve;
  }
}
