# PRD: CrossBeat - Web/Native Drum Machine

**Owner:** Levi | **Version:** 1.0 | **Target:** Q1 2025

## Overview

Cross-platform drum machine with step sequencer. Deploy as PWA + native apps (Tauri) for Mac/PC/iPad with shared codebase.

## Core Requirements

### Functionality

- **16-step sequencer** with 8 drum tracks (kick, snare, hats, etc.)
- **Timing engine**: 60-300 BPM, swing, per-step velocity/probability
- **Pattern management**: Save/load locally, share via URL
- **Audio export**: Render to WAV loop
- **Real-time playback** with sub-5ms jitter

### Platforms

- **Web**: PWA, offline-capable
- **Native**: Tauri app for macOS, Windows, iPadOS
- **Shared**: 95% codebase reuse, platform-specific audio optimizations

## User Stories (MVP)

1. Create 16-step pattern → Play/stop → Adjust tempo/swing → Export WAV
2. Set per-step velocity and hit probability
3. Save pattern locally and share via link
4. Switch between drum kits
5. Use keyboard shortcuts for live recording

## Technical Architecture

### Stack

- **Frontend**: React + TypeScript + Zustand
- **Audio**: Web Audio API + custom scheduler
- **Native**: Tauri 2.0 with Rust audio optimizations
- **Storage**: IndexedDB (web) + SQLite (native)
- **Build**: Vite + Tauri CLI

### Audio Engine

```typescript
interface Pattern {
    bpm: number;
    swing: number; // 0-1
    tracks: Track[]; // 8 tracks
    steps: Step[][]; // 16 steps per track
}

interface Step {
    active: boolean;
    velocity: number; // 0-127
    probability: number; // 0-1
}
```

### Cross-Platform Considerations

- **Web**: Service Worker caching, Web Audio scheduler
- **Native**: Tauri audio plugins for lower latency, file system access
- **iPad**: Touch-optimized grid, gesture support
- **Responsive**: 320px-4K, portrait/landscape

## Platform-Specific Features

| Feature       | Web            | Native                |
| ------------- | -------------- | --------------------- |
| Audio Latency | ~20ms          | ~5ms (ASIO/CoreAudio) |
| File Export   | Download blob  | Direct file write     |
| Offline Mode  | Service Worker | Always offline        |
| Auto-updates  | Standard PWA   | Tauri updater         |
| Shortcuts     | Web APIs       | Native accelerators   |

## Success Metrics

- **Performance**: Audio jitter <5ms, app startup <2s
- **Quality**: Pattern export bit-perfect loops
- **Adoption**: 80% feature completion by coding agent

## Implementation Notes

### Audio Scheduler (Shared)

```typescript
class AudioScheduler {
    private lookahead = 25; // ms
    private scheduleWindow = 100; // ms

    schedule(pattern: Pattern, currentTime: number) {
        // Calculate next notes within window
        // Apply swing and probability
        // Schedule AudioBufferSourceNode
    }
}
```

### Tauri Bridge (Native Only)

```rust
#[tauri::command]
async fn export_audio(pattern: Pattern) -> Result<String, String> {
    // High-quality offline render
    // Return file path
}

#[tauri::command]
async fn optimize_audio_thread() -> Result<(), String> {
    // Set thread priority for audio processing
}
```

### Build Configuration

```json
{
    "scripts": {
        "dev": "vite",
        "dev:tauri": "tauri dev",
        "build:web": "vite build",
        "build:native": "tauri build"
    }
}
```

## Milestones

- **Week 1-2**: Core sequencer + Web Audio engine
- **Week 3**: Pattern save/load + URL sharing
- **Week 4**: Tauri integration + native builds
- **Week 5**: Audio export + performance optimization
- **Week 6**: Cross-platform testing + polish

## Acceptance Criteria

✅ 16-step pattern plays stable for 5+ minutes  
✅ Swing timing audibly correct at 60% setting  
✅ Export loops seamlessly in DAW at exact bar length  
✅ Native apps launch <2s, audio latency <10ms  
✅ Works on latest Chrome/Safari/Firefox + native platforms  
✅ Offline functionality maintained across all platforms

## Out of Scope (V1)

- Cloud sync, user accounts
- Advanced synthesis, effects chains
- Multi-pattern songs, arrangements
- Real-time collaboration

**Dependencies**: Tauri 2.0, Web Audio API support, modern browsers (2023+)
