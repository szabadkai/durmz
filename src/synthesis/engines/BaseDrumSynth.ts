// Base class for all drum synthesizers

import { SynthParameters } from '../../types/pattern';

export abstract class BaseDrumSynth {
  protected context: AudioContext;
  protected outputNode: GainNode;
  protected parameters: Map<string, number>;
  protected voices: Set<DrumVoice> = new Set();

  constructor(context: AudioContext) {
    this.context = context;
    this.outputNode = context.createGain();
    this.outputNode.gain.value = 1.0;
    this.parameters = new Map();
    this.initializeDefaultParameters();
  }

  /**
   * Initialize default parameter values
   */
  protected abstract initializeDefaultParameters(): void;

  /**
   * Trigger a drum sound
   * @param time - Audio context time to trigger the sound
   * @param velocity - Velocity (0-1)
   * @param params - Optional parameter overrides for this trigger
   */
  abstract trigger(
    time: number,
    velocity: number,
    params?: Partial<SynthParameters>
  ): void;

  /**
   * Set a synthesis parameter
   * @param param - Parameter name
   * @param value - Parameter value
   */
  setParameter(param: string, value: number): void {
    this.parameters.set(param, value);
  }

  /**
   * Get a synthesis parameter
   * @param param - Parameter name
   * @returns Current parameter value or default
   */
  getParameter(param: string, defaultValue: number = 0): number {
    return this.parameters.get(param) ?? defaultValue;
  }

  /**
   * Connect the synthesizer output to a destination
   * @param destination - Audio node to connect to
   */
  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }

  /**
   * Disconnect the synthesizer output
   */
  disconnect(): void {
    this.outputNode.disconnect();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.voices.forEach(voice => voice.stop(this.context.currentTime));
    this.voices.clear();
    this.disconnect();
  }

  /**
   * Create an exponential envelope
   */
  protected createEnvelope(
    param: AudioParam,
    startTime: number,
    startValue: number,
    endValue: number,
    duration: number
  ): void {
    param.setValueAtTime(startValue, startTime);
    param.exponentialRampToValueAtTime(
      Math.max(endValue, 0.001), // Avoid 0 for exponential ramp
      startTime + duration
    );
  }

  /**
   * Apply parameter smoothing to prevent clicks
   */
  protected smoothParameter(
    param: AudioParam,
    targetValue: number,
    time: number,
    smoothTime: number = 0.01
  ): void {
    param.setTargetAtTime(targetValue, time, smoothTime);
  }
}

/**
 * Represents an active synthesizer voice
 */
export interface DrumVoice {
  nodes: AudioNode[];
  startTime: number;
  endTime: number;
  stop(time: number): void;
}
