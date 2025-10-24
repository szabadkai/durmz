// Transport controls - Play/Stop, BPM, Swing

import React from 'react';
import { usePatternStore } from '../../store/usePatternStore';
import './Transport.css';

interface TransportProps {
  onPlayClick: () => void;
}

export const Transport: React.FC<TransportProps> = ({ onPlayClick }) => {
  const { isPlaying, bpm, pattern, setBpm, setSwing, clearPattern, randomizePattern } = usePatternStore();

  return (
    <div className="transport">
      <div className="transport-section">
        <button
          className={`transport-button ${isPlaying ? 'playing' : ''}`}
          onClick={onPlayClick}
        >
          {isPlaying ? '⏸ Stop' : '▶ Play'}
        </button>
      </div>

      <div className="transport-section">
        <label>
          BPM
          <input
            type="number"
            min="60"
            max="300"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
            className="transport-input"
          />
        </label>

        <label>
          Swing
          <input
            type="range"
            min="0"
            max="100"
            value={pattern.swing * 100}
            onChange={(e) => setSwing(parseInt(e.target.value) / 100)}
            className="transport-slider"
          />
          <span className="transport-value">{Math.round(pattern.swing * 100)}%</span>
        </label>
      </div>

      <div className="transport-section">
        <button className="transport-button secondary" onClick={clearPattern}>
          Clear
        </button>
        <button className="transport-button secondary" onClick={randomizePattern}>
          Randomize
        </button>
      </div>
    </div>
  );
};
