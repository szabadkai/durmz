// Synthesis parameter controls

import React from 'react';
import { usePatternStore } from '../../store/usePatternStore';
import { audioEngine } from '../../synthesis/AudioEngine';
import { Knob } from './Knob';
import './SynthControls.css';

interface SynthControlsProps {
  selectedTrackIndex: number;
}

export const SynthControls: React.FC<SynthControlsProps> = ({ selectedTrackIndex }) => {
  const { pattern, setSynthParameter } = usePatternStore();
  const track = pattern.tracks[selectedTrackIndex];

  if (!track) return null;

  const handleParameterChange = (param: string, value: number) => {
    // Update store
    setSynthParameter(selectedTrackIndex, param, value);

    // Update audio engine in real-time
    audioEngine.updateSynthParams(track.synthType, { [param]: value });

    // Log for debugging
    console.log(`Updated ${track.name} ${param}:`, value);
  };

  // Get parameter configurations based on synth type
  const getParameterConfig = () => {
    switch (track.synthType) {
      case 'kick':
        return [
          { key: 'pitch', label: 'Pitch', min: 20, max: 200, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.1, max: 2.0, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'subLevel', label: 'Sub', min: 0, max: 1, unit: '' },
          { key: 'clickLevel', label: 'Click', min: 0, max: 1, unit: '' },
          { key: 'pitchDecay', label: 'P.Env', min: 0.01, max: 0.2, unit: 's' },
          { key: 'saturation', label: 'Drive', min: 0, max: 1, unit: '' },
        ];

      case 'snare':
        return [
          { key: 'pitch', label: 'Pitch', min: 100, max: 800, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.05, max: 0.5, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'bodyFreq', label: 'Body', min: 100, max: 800, unit: 'Hz' },
          { key: 'noiseLevel', label: 'Noise', min: 0, max: 1, unit: '' },
          { key: 'resonance', label: 'Reso', min: 1, max: 20, unit: '' },
        ];

      case 'hihat':
        return [
          { key: 'pitch', label: 'Pitch', min: 5000, max: 12000, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.02, max: 0.5, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'color', label: 'Color', min: 5000, max: 12000, unit: 'Hz' },
          { key: 'metallic', label: 'Metal', min: 0, max: 1, unit: '' },
        ];

      case 'clap':
        return [
          { key: 'pitch', label: 'Pitch', min: 500, max: 2000, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.05, max: 0.3, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'layers', label: 'Layers', min: 2, max: 5, unit: '' },
          { key: 'spread', label: 'Spread', min: 0.01, max: 0.05, unit: 's' },
          { key: 'resonance', label: 'Reso', min: 1, max: 10, unit: '' },
        ];

      case 'rim':
        return [
          { key: 'pitch', label: 'Pitch', min: 200, max: 800, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.03, max: 0.15, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'resonance', label: 'Reso', min: 5, max: 20, unit: '' },
          { key: 'noiseLevel', label: 'Click', min: 0, max: 1, unit: '' },
        ];

      case 'tom':
        return [
          { key: 'pitch', label: 'Pitch', min: 60, max: 300, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.1, max: 1.0, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'pitchDecay', label: 'P.Env', min: 0.02, max: 0.2, unit: 's' },
          { key: 'pitchAmount', label: 'P.Amt', min: 1.5, max: 4.0, unit: '' },
          { key: 'resonance', label: 'Reso', min: 1, max: 10, unit: '' },
        ];

      case 'perc1':
      case 'perc2':
        return [
          { key: 'pitch', label: 'Pitch', min: 100, max: 1000, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.05, max: 0.5, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
          { key: 'harmonics', label: 'Harm', min: 1.5, max: 4.0, unit: '' },
          { key: 'resonance', label: 'Reso', min: 2, max: 15, unit: '' },
        ];

      default:
        return [
          { key: 'pitch', label: 'Pitch', min: 100, max: 1000, unit: 'Hz' },
          { key: 'decay', label: 'Decay', min: 0.05, max: 1.0, unit: 's' },
          { key: 'tone', label: 'Tone', min: 0, max: 1, unit: '' },
        ];
    }
  };

  const params = getParameterConfig();

  return (
    <div className="synth-controls">
      <div className="synth-controls-header">
        <div className="synth-info">
          <h3>{track.name}</h3>
          <span className="synth-type">{track.synthType} synthesis</span>
        </div>
      </div>

      <div className="synth-controls-grid">
        {params.map((param) => (
          <Knob
            key={param.key}
            label={param.label}
            value={track.synthParams[param.key] ?? ((param.min + param.max) / 2)}
            min={param.min}
            max={param.max}
            unit={param.unit}
            onChange={(value) => handleParameterChange(param.key, value)}
          />
        ))}
      </div>

      <div className="synth-controls-info">
        <button
          className="preset-button"
          onClick={() => {
            // Reset to defaults
            params.forEach(param => {
              const defaultValue = (param.min + param.max) / 2;
              handleParameterChange(param.key, defaultValue);
            });
          }}
        >
          Reset to Default
        </button>
        <span className="tip">Drag knobs to adjust • Double-click to reset</span>
      </div>
    </div>
  );
};
