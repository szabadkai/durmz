// Core pattern and sequencer types

export interface Pattern {
  id: string;
  name: string;
  bpm: number; // 60-180 BPM
  swing: number; // 0-1 (0% to 100%)
  tracks: Track[]; // 8 tracks
  steps: number; // 16 or 32 steps
  created: number; // timestamp
  version: number;
}

export interface Track {
  id: string;
  name: string;
  synthType: 'kick' | 'snare' | 'hihat' | 'clap' | 'rim' | 'tom' | 'perc1' | 'perc2';
  volume: number; // 0-1
  mute: boolean;
  solo: boolean;
  steps: StepData[];
  synthParams: SynthParameters;
}

export interface StepData {
  active: boolean;
  velocity: number; // 0-127
  probability: number; // 0-1
  microTiming: number; // -20 to +20ms
  parameters?: Partial<SynthParameters>; // Per-step parameter overrides
}

export interface SynthParameters {
  // Common parameters for all synths
  pitch: number;
  decay: number;
  tone: number;

  // Synth-specific parameters (optional)
  [key: string]: number;
}

// Kick-specific parameters
export interface KickSynthParams extends SynthParameters {
  subLevel: number; // Sub oscillator level
  clickLevel: number; // Click oscillator level
  pitchDecay: number; // Pitch envelope amount
  saturation: number; // Saturation/drive
}

// Snare-specific parameters
export interface SnareSynthParams extends SynthParameters {
  bodyFreq: number; // Body tone frequency
  noiseLevel: number; // Noise component level
  bodyDecay: number; // Body decay time
  noiseDecay: number; // Noise decay time
  resonance: number; // Filter resonance
}

// Hi-hat specific parameters
export interface HiHatSynthParams extends SynthParameters {
  color: number; // Filter cutoff for noise color
  metallic: number; // Metallic resonance amount
  chokeGroup: number; // Choke group (0-7)
}
