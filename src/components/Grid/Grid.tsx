// Sequencer grid component - 8 tracks x 16 steps

import React from 'react';
import { usePatternStore } from '../../store/usePatternStore';
import './Grid.css';

interface GridProps {
  currentStep: number;
  selectedTrackIndex: number;
  onTrackSelect: (trackIndex: number) => void;
}

export const Grid: React.FC<GridProps> = ({ currentStep, selectedTrackIndex, onTrackSelect }) => {
  const { pattern, toggleStep, toggleMute, toggleSolo, setTrackVolume } = usePatternStore();

  return (
    <div className="grid-container">
      {pattern.tracks.map((track, trackIndex) => (
        <div
          key={track.id}
          className={`grid-row ${selectedTrackIndex === trackIndex ? 'selected' : ''}`}
          onClick={() => onTrackSelect(trackIndex)}
        >
          <div className="track-header">
            <div className="track-info">
              <span className="track-name">{track.name}</span>
              <span className="track-type">{track.synthType}</span>
            </div>
            <div className="track-controls">
              <button
                className={`track-button ${track.mute ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute(trackIndex);
                }}
                title="Mute"
              >
                M
              </button>
              <button
                className={`track-button ${track.solo ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSolo(trackIndex);
                }}
                title="Solo"
              >
                S
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={track.volume * 100}
                onChange={(e) => setTrackVolume(trackIndex, parseInt(e.target.value) / 100)}
                onClick={(e) => e.stopPropagation()}
                className="track-volume"
                title="Volume"
              />
            </div>
          </div>

          <div className="steps-container">
            {track.steps.map((step, stepIndex) => (
              <button
                key={stepIndex}
                className={`step ${step.active ? 'active' : ''} ${
                  stepIndex === currentStep ? 'current' : ''
                } ${stepIndex % 4 === 0 ? 'beat' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStep(trackIndex, stepIndex);
                }}
                title={`Step ${stepIndex + 1}\nVelocity: ${step.velocity}\nProbability: ${Math.round(step.probability * 100)}%`}
              >
                <div className="step-indicator" style={{ opacity: step.velocity / 127 }} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
