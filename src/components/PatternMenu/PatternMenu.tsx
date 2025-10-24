// Pattern management menu

import React, { useState, useRef } from 'react';
import { usePatternStore } from '../../store/usePatternStore';
import { PatternBrowser } from '../PatternBrowser/PatternBrowser';
import { exportPatternAsJSON, importPatternFromJSON } from '../../utils/patternImportExport';
import { getShareableURL } from '../../utils/patternSharing';
import './PatternMenu.css';

export const PatternMenu: React.FC = () => {
  const {
    pattern,
    setPatternName,
    saveCurrentPattern,
    newPattern,
    duplicatePattern
  } = usePatternStore();

  const [showBrowser, setShowBrowser] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    await saveCurrentPattern();
    setShowMenu(false);
  };

  const handleNew = () => {
    if (confirm('Create new pattern? Unsaved changes will be lost.')) {
      newPattern();
      setShowMenu(false);
    }
  };

  const handleDuplicate = () => {
    duplicatePattern();
    setShowMenu(false);
  };

  const handleExport = () => {
    exportPatternAsJSON(pattern);
    setShowMenu(false);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importPatternFromJSON(file);
      usePatternStore.getState().loadPattern(imported);
      setShowMenu(false);
    } catch (error) {
      alert('Failed to import pattern: ' + (error as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleShare = async () => {
    const url = getShareableURL(pattern);
    try {
      await navigator.clipboard.writeText(url);
      alert('Pattern URL copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      prompt('Copy this URL to share your pattern:', url);
    }
    setShowMenu(false);
  };

  const handleNameChange = (newName: string) => {
    setPatternName(newName);
  };

  return (
    <div className="pattern-menu">
      <div className="pattern-name-container">
        {isEditingName ? (
          <input
            type="text"
            className="pattern-name-input"
            value={pattern.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            autoFocus
          />
        ) : (
          <div
            className="pattern-name"
            onClick={() => setIsEditingName(true)}
            title="Click to edit pattern name"
          >
            {pattern.name}
          </div>
        )}
      </div>

      <div className="pattern-menu-buttons">
        <button className="pattern-menu-button" onClick={handleSave} title="Save pattern">
          💾 Save
        </button>

        <button
          className="pattern-menu-button"
          onClick={() => setShowBrowser(true)}
          title="Load pattern"
        >
          📁 Load
        </button>

        <div className="pattern-menu-dropdown">
          <button
            className="pattern-menu-button"
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
          >
            ⋮
          </button>

          {showMenu && (
            <div className="dropdown-menu">
              <button onClick={handleNew}>🆕 New</button>
              <button onClick={handleDuplicate}>📋 Duplicate</button>
              <div className="menu-divider" />
              <button onClick={handleShare}>🔗 Share URL</button>
              <button onClick={handleExport}>⬇️ Export JSON</button>
              <button onClick={handleImport}>⬆️ Import JSON</button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <PatternBrowser isOpen={showBrowser} onClose={() => setShowBrowser(false)} />

      {showMenu && (
        <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
};
