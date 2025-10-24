// Reusable knob component for synthesis parameters

import React, { useRef, useState, useCallback } from 'react';
import './Knob.css';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  unit = '',
  step = 0.01
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  // Convert value to rotation angle (0-270 degrees)
  const valueToAngle = (val: number): number => {
    const normalized = (val - min) / (max - min);
    return normalized * 270 - 135; // -135 to +135 degrees
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = startYRef.current - e.clientY;
    const range = max - min;
    const sensitivity = range / 300; // 300 pixels for full range (slower, more precise)
    let newValue = startValueRef.current + deltaY * sensitivity;

    // Round to step if provided
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }

    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  }, [isDragging, min, max, step, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Double-click to reset to default (middle value)
  const handleDoubleClick = () => {
    const defaultValue = (min + max) / 2;
    onChange(defaultValue);
  };

  const angle = valueToAngle(value);
  const displayValue = unit === 'Hz' || unit === 'ms' ? Math.round(value) : value.toFixed(2);

  return (
    <div className="knob-container">
      <div
        className={`knob ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${displayValue}${unit}\nDrag to adjust, double-click to reset`}
      >
        <svg width="60" height="60" viewBox="0 0 60 60">
          {/* Background track */}
          <circle
            cx="30"
            cy="30"
            r="25"
            fill="none"
            stroke="#0f3460"
            strokeWidth="3"
          />

          {/* Value arc */}
          <circle
            cx="30"
            cy="30"
            r="25"
            fill="none"
            stroke="url(#knobGradient)"
            strokeWidth="3"
            strokeDasharray={`${((value - min) / (max - min)) * 157} 157`}
            strokeLinecap="round"
            transform="rotate(-135 30 30)"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00adb5" />
              <stop offset="100%" stopColor="#00d4dd" />
            </linearGradient>
          </defs>

          {/* Center indicator */}
          <circle cx="30" cy="30" r="20" fill="#16213e" />

          {/* Pointer */}
          <line
            x1="30"
            y1="30"
            x2="30"
            y2="12"
            stroke="#00adb5"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 30 30)`}
          />
        </svg>
      </div>

      <div className="knob-label">{label}</div>
      <div className="knob-value">{displayValue}{unit}</div>
    </div>
  );
};
