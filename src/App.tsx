// Main application component

import React, { useEffect, useState } from 'react';
import { Transport } from './components/Transport/Transport';
import { Grid } from './components/Grid/Grid';
import { SynthControls } from './components/SynthControls/SynthControls';
import { PatternMenu } from './components/PatternMenu/PatternMenu';
import { usePatternStore } from './store/usePatternStore';
import { audioEngine } from './synthesis/AudioEngine';
import { sequencer } from './synthesis/Sequencer';
import { patternStorage } from './utils/patternStorage';
import { loadPatternFromURL } from './utils/patternSharing';
import './App.css';

export const App: React.FC = () => {
  const { pattern, isPlaying, setCurrentStep, togglePlay } = usePatternStore();
  const [currentStep, setLocalCurrentStep] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      // Initialize IndexedDB
      await patternStorage.init();

      // Load saved patterns
      await usePatternStore.getState().loadSavedPatterns();

      // Check for pattern in URL
      const urlPattern = loadPatternFromURL();
      if (urlPattern) {
        const fullPattern = {
          ...urlPattern,
          id: crypto.randomUUID(),
          created: Date.now(),
          version: 1
        } as any;
        usePatternStore.getState().loadPattern(fullPattern);
        console.log('Loaded pattern from URL');
      }
    };

    initApp();
  }, []);

  // Initialize audio engine on user interaction
  const initializeAudio = async () => {
    if (!audioInitialized) {
      await audioEngine.initialize();

      // Initialize synth parameters for all tracks
      pattern.tracks.forEach(track => {
        audioEngine.updateSynthParams(track.synthType, track.synthParams);
      });

      setAudioInitialized(true);
      console.log('Audio initialized with track parameters');
    }
  };

  // Handle play button click - initialize audio if needed, then toggle play
  const handlePlayClick = async () => {
    await initializeAudio();
    togglePlay();
  };

  // Handle play/stop
  useEffect(() => {
    if (!audioInitialized) return;

    if (isPlaying) {
      sequencer.start(pattern, (step) => {
        setLocalCurrentStep(step);
        setCurrentStep(step);
      });
    } else {
      sequencer.stop();
      setLocalCurrentStep(0);
    }

    return () => {
      sequencer.stop();
    };
  }, [isPlaying, audioInitialized]);

  // Update sequencer pattern when it changes
  useEffect(() => {
    if (audioInitialized) {
      sequencer.updatePattern(pattern);
    }
  }, [pattern, audioInitialized]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        await handlePlayClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioInitialized]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>CrossBeat</h1>
          <span className="app-subtitle">Pure Synthesis Drum Machine</span>
        </div>

        <PatternMenu />

        {audioInitialized && (
          <div className="audio-status">
            <div className="status-indicator active" />
            <span>Audio Engine Active</span>
          </div>
        )}
      </header>

      <Transport onPlayClick={handlePlayClick} />

      <main className="app-main">
        <Grid
          currentStep={currentStep}
          selectedTrackIndex={selectedTrackIndex}
          onTrackSelect={setSelectedTrackIndex}
        />
        <SynthControls selectedTrackIndex={selectedTrackIndex} />
      </main>

      <footer className="app-footer">
        <p>
          Pattern: {pattern.name} | Steps: {pattern.steps} |
          Created with Web Audio API synthesis
        </p>
      </footer>
    </div>
  );
};
