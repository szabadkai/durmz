// Main audio engine manager - handles AudioContext and synth instances

import { KickSynth } from './engines/KickSynth';
import { SnareSynth } from './engines/SnareSynth';
import { HiHatSynth } from './engines/HiHatSynth';
import { ClapSynth } from './engines/ClapSynth';
import { RimSynth } from './engines/RimSynth';
import { TomSynth } from './engines/TomSynth';
import { PercSynth } from './engines/PercSynth';
import { BaseDrumSynth } from './engines/BaseDrumSynth';

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private synths: Map<string, BaseDrumSynth> = new Map();
  private initialized = false;

  /**
   * Initialize the audio context and synthesizers
   * Must be called from a user gesture (click/touch)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create AudioContext
    this.context = new AudioContext();

    // Create master gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.context.destination);

    // Initialize synthesizers for each track type
    this.initializeSynths();

    // Resume context if suspended (required by browser autoplay policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.initialized = true;
    console.log('Audio engine initialized', {
      sampleRate: this.context.sampleRate,
      state: this.context.state
    });
  }

  private initializeSynths(): void {
    if (!this.context || !this.masterGain) return;

    // Create all synth instances
    const kickSynth = new KickSynth(this.context);
    const snareSynth = new SnareSynth(this.context);
    const hihatSynth = new HiHatSynth(this.context);
    const clapSynth = new ClapSynth(this.context);
    const rimSynth = new RimSynth(this.context);
    const tomSynth = new TomSynth(this.context);
    const perc1Synth = new PercSynth(this.context);
    const perc2Synth = new PercSynth(this.context);

    // Connect all to master
    kickSynth.connect(this.masterGain);
    snareSynth.connect(this.masterGain);
    hihatSynth.connect(this.masterGain);
    clapSynth.connect(this.masterGain);
    rimSynth.connect(this.masterGain);
    tomSynth.connect(this.masterGain);
    perc1Synth.connect(this.masterGain);
    perc2Synth.connect(this.masterGain);

    // Store by type
    this.synths.set('kick', kickSynth);
    this.synths.set('snare', snareSynth);
    this.synths.set('hihat', hihatSynth);
    this.synths.set('clap', clapSynth);
    this.synths.set('rim', rimSynth);
    this.synths.set('tom', tomSynth);
    this.synths.set('perc1', perc1Synth);
    this.synths.set('perc2', perc2Synth);

    console.log('Initialized 8 synthesis engines');
  }

  /**
   * Trigger a drum sound
   */
  triggerDrum(
    synthType: string,
    velocity: number,
    params?: any
  ): void {
    if (!this.context || !this.initialized) {
      console.warn('Audio engine not initialized');
      return;
    }

    const synth = this.synths.get(synthType);
    if (!synth) {
      console.warn(`Synth type not found: ${synthType}`);
      return;
    }

    const time = this.context.currentTime;
    synth.trigger(time, velocity / 127, params);
  }

  /**
   * Update synthesis parameters for a track
   */
  updateSynthParams(synthType: string, params: Record<string, number>): void {
    const synth = this.synths.get(synthType);
    if (!synth) return;

    Object.entries(params).forEach(([key, value]) => {
      synth.setParameter(key, value);
    });
  }

  /**
   * Get current audio context time
   */
  getCurrentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  /**
   * Get audio context
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.context?.currentTime ?? 0
      );
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.synths.forEach(synth => synth.dispose());
    this.synths.clear();
    this.masterGain?.disconnect();
    this.context?.close();
    this.initialized = false;
  }
}

// Global audio engine instance
export const audioEngine = new AudioEngine();
