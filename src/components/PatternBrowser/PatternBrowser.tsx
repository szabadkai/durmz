// Pattern browser for loading saved patterns

import React from 'react';
import { usePatternStore } from '../../store/usePatternStore';
import { Pattern } from '../../types/pattern';
import './PatternBrowser.css';

interface PatternBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatternBrowser: React.FC<PatternBrowserProps> = ({ isOpen, onClose }) => {
  const { savedPatterns, loadPattern, deletePattern } = usePatternStore();

  const handleLoad = (pattern: Pattern) => {
    loadPattern(pattern);
    onClose();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this pattern?')) {
      await deletePattern(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="pattern-browser-overlay" onClick={onClose}>
      <div className="pattern-browser" onClick={(e) => e.stopPropagation()}>
        <div className="pattern-browser-header">
          <h2>Pattern Library</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="pattern-browser-content">
          {savedPatterns.length === 0 ? (
            <div className="empty-state">
              <p>No saved patterns yet</p>
              <span>Create a pattern and click Save to add it to your library</span>
            </div>
          ) : (
            <div className="pattern-list">
              {savedPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="pattern-item"
                  onClick={() => handleLoad(pattern)}
                >
                  <div className="pattern-item-header">
                    <h3>{pattern.name}</h3>
                    <button
                      className="delete-button"
                      onClick={(e) => handleDelete(pattern.id, e)}
                      title="Delete pattern"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="pattern-item-details">
                    <span className="pattern-bpm">{pattern.bpm} BPM</span>
                    <span className="pattern-swing">
                      {Math.round(pattern.swing * 100)}% swing
                    </span>
                    <span className="pattern-steps">{pattern.steps} steps</span>
                  </div>

                  <div className="pattern-item-date">
                    {formatDate(pattern.created)}
                  </div>

                  {/* Visual preview of active steps */}
                  <div className="pattern-preview">
                    {pattern.tracks.slice(0, 4).map((track, trackIndex) => (
                      <div key={track.id} className="preview-track">
                        {track.steps.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            className={`preview-step ${step.active ? 'active' : ''}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
