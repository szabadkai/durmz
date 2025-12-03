// Pattern store using Zustand with Immer for immutable updates

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Pattern, Track } from '../types/pattern';
import { patternStorage } from '../utils/patternStorage';

interface PatternState {
  // Current pattern
  pattern: Pattern;

  // Playback state
  isPlaying: boolean;
  currentStep: number;
  bpm: number;

  // Pattern library
  savedPatterns: Pattern[];

  // Actions
  toggleStep: (trackIndex: number, stepIndex: number) => void;
  setStepVelocity: (trackIndex: number, stepIndex: number, velocity: number) => void;
  setStepProbability: (trackIndex: number, stepIndex: number, probability: number) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  togglePlay: () => void;
  setCurrentStep: (step: number) => void;
  setTrackVolume: (trackIndex: number, volume: number) => void;
  toggleMute: (trackIndex: number) => void;
  toggleSolo: (trackIndex: number) => void;
  setSynthParameter: (trackIndex: number, param: string, value: number) => void;
  clearPattern: () => void;
  randomizePattern: () => void;

  // Pattern management
  saveCurrentPattern: () => Promise<void>;
  loadPattern: (pattern: Pattern) => void;
  deletePattern: (id: string) => Promise<void>;
  loadSavedPatterns: () => Promise<void>;
  newPattern: () => void;
  setPatternName: (name: string) => void;
  duplicatePattern: () => void;
}

const createDefaultPattern = (): Pattern => {
  const defaultTracks: Track[] = [
    { id: '0', name: 'Kick', synthType: 'kick', volume: 1, mute: false, solo: false, steps: [], synthParams: { pitch: 60, decay: 0.5, tone: 0.5 } },
    { id: '1', name: 'Snare', synthType: 'snare', volume: 0.8, mute: false, solo: false, steps: [], synthParams: { pitch: 200, decay: 0.15, tone: 0.5 } },
    { id: '2', name: 'Closed HH', synthType: 'hihat', volume: 0.6, mute: false, solo: false, steps: [], synthParams: { pitch: 8000, decay: 0.05, tone: 0.7 } },
    { id: '3', name: 'Open HH', synthType: 'hihat', volume: 0.5, mute: false, solo: false, steps: [], synthParams: { pitch: 8000, decay: 0.15, tone: 0.6 } },
    { id: '4', name: 'Clap', synthType: 'clap', volume: 0.7, mute: false, solo: false, steps: [], synthParams: { pitch: 1000, decay: 0.1, tone: 0.6 } },
    { id: '5', name: 'Rim', synthType: 'rim', volume: 0.7, mute: false, solo: false, steps: [], synthParams: { pitch: 400, decay: 0.08, tone: 0.7 } },
    { id: '6', name: 'Tom', synthType: 'tom', volume: 0.8, mute: false, solo: false, steps: [], synthParams: { pitch: 150, decay: 0.4, tone: 0.5 } },
    { id: '7', name: 'Perc', synthType: 'perc1', volume: 0.6, mute: false, solo: false, steps: [], synthParams: { pitch: 300, decay: 0.12, tone: 0.5 } },
  ];

  // Initialize 16 steps for each track
  defaultTracks.forEach(track => {
    track.steps = Array.from({ length: 16 }, () => ({
      active: false,
      velocity: 100,
      probability: 1.0,
      microTiming: 0,
    }));
  });

  return {
    id: crypto.randomUUID(),
    name: 'New Pattern',
    bpm: 120,
    swing: 0,
    tracks: defaultTracks,
    steps: 16,
    created: Date.now(),
    version: 1,
  };
};

export const usePatternStore = create<PatternState>()(
  immer((set, get) => ({
    pattern: createDefaultPattern(),
    isPlaying: false,
    currentStep: 0,
    bpm: 120,
    savedPatterns: [],

    toggleStep: (trackIndex, stepIndex) =>
      set((state) => {
        state.pattern.tracks[trackIndex].steps[stepIndex].active =
          !state.pattern.tracks[trackIndex].steps[stepIndex].active;
      }),

    setStepVelocity: (trackIndex, stepIndex, velocity) =>
      set((state) => {
        state.pattern.tracks[trackIndex].steps[stepIndex].velocity = Math.max(0, Math.min(127, velocity));
      }),

    setStepProbability: (trackIndex, stepIndex, probability) =>
      set((state) => {
        state.pattern.tracks[trackIndex].steps[stepIndex].probability = Math.max(0, Math.min(1, probability));
      }),

    setBpm: (bpm) =>
      set((state) => {
        state.pattern.bpm = Math.max(60, Math.min(300, bpm));
        state.bpm = state.pattern.bpm;
      }),

    setSwing: (swing) =>
      set((state) => {
        state.pattern.swing = Math.max(0, Math.min(1, swing));
      }),

    togglePlay: () =>
      set((state) => {
        state.isPlaying = !state.isPlaying;
        if (!state.isPlaying) {
          state.currentStep = 0;
        }
      }),

    setCurrentStep: (step) =>
      set((state) => {
        state.currentStep = step % state.pattern.steps;
      }),

    setTrackVolume: (trackIndex, volume) =>
      set((state) => {
        state.pattern.tracks[trackIndex].volume = Math.max(0, Math.min(1, volume));
      }),

    toggleMute: (trackIndex) =>
      set((state) => {
        state.pattern.tracks[trackIndex].mute = !state.pattern.tracks[trackIndex].mute;
      }),

    toggleSolo: (trackIndex) =>
      set((state) => {
        state.pattern.tracks[trackIndex].solo = !state.pattern.tracks[trackIndex].solo;
      }),

    setSynthParameter: (trackIndex, param, value) =>
      set((state) => {
        state.pattern.tracks[trackIndex].synthParams[param] = value;
      }),

    clearPattern: () =>
      set((state) => {
        state.pattern.tracks.forEach(track => {
          track.steps.forEach(step => {
            step.active = false;
          });
        });
      }),

    randomizePattern: () =>
      set((state) => {
        state.pattern.tracks.forEach((track, trackIndex) => {
          track.steps.forEach((step) => {
            // Different densities for different drums
            const density = trackIndex === 0 ? 0.3 : // Kick - sparse
                          trackIndex === 1 ? 0.2 : // Snare - sparse
                          trackIndex === 2 ? 0.5 : // Closed HH - medium
                          0.25; // Others - sparse to medium

            step.active = Math.random() < density;
            if (step.active) {
              step.velocity = 80 + Math.floor(Math.random() * 47); // 80-127
              step.probability = 0.7 + Math.random() * 0.3; // 0.7-1.0
            }
          });
        });
      }),

    // Pattern management actions
    saveCurrentPattern: async () => {
      const pattern = get().pattern;
      await patternStorage.savePattern(pattern);
      await get().loadSavedPatterns();
      console.log('Pattern saved:', pattern.name);
    },

    loadPattern: (pattern) =>
      set((state) => {
        state.pattern = pattern;
        state.bpm = pattern.bpm;
        state.isPlaying = false;
        state.currentStep = 0;
      }),

    deletePattern: async (id) => {
      await patternStorage.deletePattern(id);
      await get().loadSavedPatterns();
    },

    loadSavedPatterns: async () => {
      const patterns = await patternStorage.getAllPatterns();
      set((state) => {
        state.savedPatterns = patterns;
      });
    },

    newPattern: () =>
      set((state) => {
        state.pattern = createDefaultPattern();
        state.bpm = 120;
        state.isPlaying = false;
        state.currentStep = 0;
      }),

    setPatternName: (name) =>
      set((state) => {
        state.pattern.name = name;
      }),

    duplicatePattern: () =>
      set((state) => {
        const newPattern = {
          ...state.pattern,
          id: crypto.randomUUID(),
          name: `${state.pattern.name} (copy)`,
          created: Date.now()
        };
        state.pattern = newPattern;
      }),
  }))
);
