// Sequencer engine with precise timing using Web Audio API

import { Pattern } from '../types/pattern';
import { audioEngine } from './AudioEngine';

export class Sequencer {
  private isPlaying = false;
  private currentStep = 0;
  private nextStepTime = 0;
  private lookahead = 25; // ms
  private scheduleAheadTime = 0.1; // seconds
  private timerID: number | null = null;
  private pattern: Pattern | null = null;
  private onStepCallback: ((step: number) => void) | null = null;

  /**
   * Start the sequencer
   */
  start(pattern: Pattern, onStep?: (step: number) => void): void {
    if (this.isPlaying) return;

    if (!audioEngine.isInitialized()) {
      console.error('Audio engine not initialized');
      return;
    }

    this.pattern = pattern;
    this.onStepCallback = onStep ?? null;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = audioEngine.getCurrentTime();

    this.schedule();
    this.timerID = window.setInterval(() => this.schedule(), this.lookahead);

    console.log('Sequencer started', { bpm: pattern.bpm });
  }

  /**
   * Stop the sequencer
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.currentStep = 0;

    if (this.timerID !== null) {
      clearInterval(this.timerID);
      this.timerID = null;
    }

    console.log('Sequencer stopped');
  }

  /**
   * Schedule notes within the lookahead window
   */
  private schedule(): void {
    if (!this.pattern || !this.isPlaying) return;

    const currentTime = audioEngine.getCurrentTime();

    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStep();
    }
  }

  /**
   * Schedule a single step
   */
  private scheduleStep(step: number, time: number): void {
    if (!this.pattern) return;

    // Notify UI of current step
    if (this.onStepCallback) {
      // Schedule UI update slightly before audio for visual feedback
      const uiDelay = Math.max(0, (time - audioEngine.getCurrentTime()) * 1000 - 10);
      setTimeout(() => this.onStepCallback?.(step), uiDelay);
    }

    // Check if any tracks have solo enabled
    const hasSolo = this.pattern.tracks.some(track => track.solo);

    // Trigger each track's step
    this.pattern.tracks.forEach((track) => {
      const stepData = track.steps[step];

      if (!stepData.active) return;
      if (track.mute) return;
      if (hasSolo && !track.solo) return;

      // Apply probability
      if (Math.random() > stepData.probability) return;

      // Trigger the drum with velocity and current track parameters
      const velocity = stepData.velocity * track.volume;

      // Merge track parameters with step-specific overrides
      const triggerParams = {
        ...track.synthParams,
        ...stepData.parameters
      };

      audioEngine.triggerDrum(track.synthType, velocity, triggerParams);
    });
  }

  /**
   * Advance to next step
   */
  private nextStep(): void {
    if (!this.pattern) return;

    const secondsPerBeat = 60.0 / this.pattern.bpm;
    const secondsPerStep = secondsPerBeat / 4; // 16th notes

    // Apply swing to odd steps (steps 1, 3, 5, etc.)
    let swingOffset = 0;
    if (this.currentStep % 2 === 1 && this.pattern.swing > 0) {
      // Swing delays odd steps by a percentage of the step time
      swingOffset = secondsPerStep * this.pattern.swing * 0.5;
    }

    this.nextStepTime += secondsPerStep + swingOffset;
    this.currentStep = (this.currentStep + 1) % this.pattern.steps;
  }

  /**
   * Update the pattern (for live parameter changes)
   */
  updatePattern(pattern: Pattern): void {
    this.pattern = pattern;
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current step
   */
  getCurrentStep(): number {
    return this.currentStep;
  }
}

// Global sequencer instance
export const sequencer = new Sequencer();
