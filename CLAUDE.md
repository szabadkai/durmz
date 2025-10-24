# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CrossBeat is a professional synthesis-based drum machine with MIDI integration, optimized for Chrome browsers. It's a static PWA with:
- Pure synthesis engine (no samples) - oscillators, filters, and envelopes
- Web MIDI API integration for DAW connectivity and real-time control
- 16-step sequencer with 8 synthesis-based drum tracks
- Sub-5ms audio latency using AudioWorklet
- MIDI clock sync and MIDI file export
- Pattern and audio export capabilities

**Tech Stack:** React + TypeScript + Zustand + Web Audio API + Web MIDI API + Vite

## Development Commands

Since this is a new project, the following commands should be set up during scaffolding:

```bash
# Project initialization (from implementation plan)
npm create vite@latest crossbeat-synth -- --template react-ts
cd crossbeat-synth
npm install zustand @types/webmidi @types/web-audio-api
npm install -D @types/audioworklet-polyfill workbox-cli prettier eslint

# Development commands (standard for Vite projects)
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test            # Run test suite
```

## Architecture

### Synthesis Engine Architecture

The audio system uses a modular synthesis architecture:

1. **Main Thread**: Handles UI state, pattern management, MIDI I/O, and user interactions
2. **AudioWorklet Thread**: Runs real-time synthesis engines and precise audio scheduler with <3ms jitter

**Critical Design Decisions:**
- **Pure synthesis** - no samples, all sounds generated from oscillators, filters, and envelopes
- **Modular design** - each drum sound is an independent synthesis engine (KickSynth, SnareSynth, HiHatSynth)
- AudioWorklet for sub-5ms latency synthesis
- 128-sample buffer size = 2.9ms at 44.1kHz
- Web Audio API oscillators, filters, and envelope generators
- Real-time parameter automation without audio glitches

**Individual Synthesis Engines:**

- **Kick Drum**: Sub oscillator (40-80Hz) + click oscillator (2-8kHz) + pitch envelope + saturation
- **Snare Drum**: Filtered sawtooth tone (150-400Hz) + high-passed noise burst + dual envelope
- **Hi-Hat**: Multiple filtered noise generators + metallic resonance + choke groups

### State Management

Uses Zustand with Immer for immutable state updates:
- **Synthesis parameters**: Real-time parameter changes routed to AudioWorklet
- **MIDI state**: MIDI device connections, mappings, and clock sync
- **Audio-critical state**: Isolated from UI state to prevent audio thread interference
- **Pattern state**: Versioned schema for future migrations, includes per-step synthesis parameters
- **Storage**: IndexedDB (primary) with localStorage fallback

### Core Data Models

```typescript
interface Pattern {
    id: string;
    name: string;
    bpm: number;          // 60-180 BPM
    swing: number;        // 0-1 (0% to 100%)
    tracks: Track[8];     // Exactly 8 tracks
    steps: number;        // 16 or 32 steps
    created: timestamp;
    version: number;
}

interface Track {
    id: string;
    name: string;
    sampleId: string;
    volume: number;       // 0-1
    mute: boolean;
    solo: boolean;
    steps: StepData[];
}

interface StepData {
    active: boolean;
    velocity: number;     // 1-127
    probability: number;  // 0-1
    microTiming: number;  // -20 to +20ms
    parameters: {
        [synthParam: string]: number;  // Per-step synthesis parameter overrides
    };
}
```

### Project Structure

```
src/
├── synthesis/             # Synthesis engine core
│   ├── engines/           # Individual drum synthesis engines
│   │   ├── KickSynth.ts   # Kick drum synthesis (sub + click oscillators)
│   │   ├── SnareSynth.ts  # Snare synthesis (tone + noise)
│   │   ├── HiHatSynth.ts  # Hi-hat synthesis (filtered noise)
│   │   └── BaseDrumSynth.ts  # Abstract base class for all drum synths
│   ├── processors/        # AudioWorklet processors
│   │   ├── envelope.worklet.ts
│   │   ├── noise.worklet.ts
│   │   └── filter.worklet.ts
│   └── parameters/        # Synthesis parameter management
│       ├── SynthParams.ts
│       └── ModulationMatrix.ts
├── midi/                  # Web MIDI API integration
│   ├── MidiManager.ts     # MIDI device management and I/O
│   ├── MidiClock.ts       # MIDI clock sync (24 PPQ)
│   └── MidiMapping.ts     # MIDI learn and CC mapping
├── audioworklet/          # Core AudioWorklet processors
│   ├── synthesis.worklet.ts  # Main synthesis processor
│   └── sequencer.worklet.ts  # Pattern scheduler
├── store/                 # Zustand state management
│   └── usePatternStore.ts
├── components/            # React UI components
│   ├── Grid/              # 16-step sequencer grid
│   ├── Transport/         # Play/stop/tempo controls
│   ├── SynthControls/     # Synthesis parameter controls (knobs, XY pads)
│   └── MidiConfig/        # MIDI device configuration UI
└── utils/
    ├── export.ts          # Audio + MIDI export using OfflineAudioContext
    └── midifile.ts        # MIDI file generation
```

## Chrome-Specific Optimizations

This project targets Chrome 88+ exclusively:

1. **AudioWorklet**: Use Chrome's optimized implementation for real-time synthesis
2. **SharedArrayBuffer**: Enable with proper COOP/COEP headers for synthesis data sharing
3. **Web MIDI API**: Full MIDI I/O support (Chrome 43+)
4. **File System Access API**: For direct file saves (Chrome 86+)
5. **Web Audio Threading**: Leverage Chrome's automatic multi-threading
6. **WebAssembly SIMD**: Use WASM SIMD for synthesis calculations (optional optimization)

## Performance Requirements

**Critical Metrics:**
- Synthesis timing jitter: <3ms average
- MIDI latency: <2ms note-on to synthesis trigger
- MIDI clock accuracy: ±1ms over 1 hour
- Parameter automation: <1ms response time
- CPU usage: <15% on mid-tier devices during complex synthesis
- Memory usage: <150MB including all synthesis engines
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s

**Testing Requirements:**
- Pattern must play stable for 10+ minutes without timing drift
- Synthesis export must be bit-perfect (loops seamlessly in DAWs)
- MIDI clock must stay in sync with external hardware/DAWs
- All synthesis parameters must respond to MIDI CC
- Offline functionality must work after first load

## Pattern Sharing & Export System

**Pattern Sharing via URL:**
Patterns (including synthesis parameters) are shared via URL fragments:
1. JSON.stringify(pattern) - includes all per-step synthesis parameters
2. Base64 encode (no compression needed for synthesis data)
3. Append to URL as `#pattern=<encoded>`

This keeps everything client-side (no backend required).

**MIDI Export:**
Patterns can be exported as Standard MIDI Files (SMF):
- Type 1 MIDI files with multi-track support
- GM drum map (note 36=Kick, 38=Snare, 42=Closed Hat, etc.)
- Synthesis parameter changes exported as CC automation
- Swing and timing preserved in MIDI export
- Loop markers embedded for DAW integration

## Audio & MIDI Export

**Audio Export (Synthesis Rendering):**
Export uses OfflineAudioContext in a Web Worker:
- Recreates all synthesis engines in offline context
- Bit-perfect synthesis rendering with exact timing
- Prevents main thread blocking during long renders
- Supports 1-8 bar loop lengths
- Outputs 44.1kHz/16-bit WAV (standard), 96kHz/24-bit WAV (high quality), or FLAC
- Individual track stems (separate synthesis renders)
- Includes metadata (tempo, time signature, synthesis settings)

**MIDI Export:**
- Standard MIDI File (Type 1) generation
- GM drum mapping for DAW compatibility
- Parameter automation as MIDI CC data
- Accurate velocity and timing reproduction
- Loop points and tempo metadata

## PWA Implementation

Service Worker strategy:
- **Cache-first**: App shell, samples (static assets)
- **Network-first**: Pattern sharing APIs (when implemented)
- **Background sync**: Pattern backups (when online)

Install prompt should appear after user creates 3 successful patterns.

## Important Constraints

1. **Pure Synthesis**: NO sample playback - all sounds must be generated via Web Audio API synthesis
2. **No Native Apps**: This is web-only, static deployment only
3. **Chrome-Only**: Target Chrome 88+ exclusively, don't add polyfills for other browsers unless explicitly requested
4. **Static Deployment**: No backend/server code - everything runs client-side
5. **Offline-First**: App must work without network after initial load (synthesis engines work offline)
6. **Fixed Track Count**: Always 8 tracks (don't make this configurable)
7. **MIDI Compliance**: Must follow GM drum map standard for MIDI note assignments
8. **Cross-Origin Isolation**: Must enable COOP/COEP headers for SharedArrayBuffer support

## Development Workflow

1. **Synthesis Changes**: Test audio quality (THD+N <1%) and timing accuracy
2. **MIDI Changes**: Verify MIDI clock accuracy and CC response
3. **Audio Changes**: Always test timing accuracy with a 10-minute playback test
4. **UI Changes**: Profile with Chrome DevTools to ensure <16ms render time
5. **State Changes**: Verify immutability - never mutate pattern state directly
6. **Export Changes**:
   - Verify exported audio loops are bit-perfect by importing to a DAW
   - Verify exported MIDI files load correctly in various DAWs (Ableton, Logic, FL Studio)

## Testing Strategy

**Unit Tests:**
- Synthesis engine quality (THD+N measurements)
- Audio timing mathematics
- MIDI message parsing and generation
- Pattern state mutations

**Integration Tests:**
- Full synthesis pattern playback accuracy
- MIDI I/O functionality
- MIDI clock sync with external devices
- Save/load from IndexedDB
- URL sharing round-trip (with synthesis parameters)

**Performance Tests:**
- CPU usage during complex synthesis patterns
- Memory usage over 10-minute session
- Synthesis latency (<5ms)
- MIDI latency (<2ms)
- MIDI clock drift measurement

**Audio Quality Tests:**
- THD+N <1% for all synthesis engines
- Frequency response validation
- Dynamic range verification

**Manual Testing:**
- Export WAV and verify loop point in DAW
- Export MIDI and verify it triggers external synths correctly
- Connect MIDI controller and verify parameter control
- Test MIDI clock sync with external hardware/DAWs
- Test offline functionality (disable network in DevTools)
- Test on mobile Chrome (touch interactions for synthesis controls)

## Common Pitfalls

1. **AudioContext Autoplay**: Chrome requires user gesture before AudioContext creation - show clear UI prompts
2. **Memory Leaks**: Synthesis voice instances must be properly pooled and recycled - use voice pooling pattern
3. **Timing Drift**: Never use setTimeout for audio/MIDI scheduling - only use AudioWorklet and Web Audio currentTime
4. **State Mutations**: Always use Immer for nested pattern updates to maintain immutability
5. **MIDI Timing**: Use Web Audio API's `currentTime` for MIDI event timing, not Date.now() or performance.now()
6. **Parameter Smoothing**: Always smooth synthesis parameters to prevent audio clicks/pops
7. **Voice Stealing**: Implement proper voice stealing when max polyphony is reached
8. **MIDI Permissions**: Web MIDI API requires user permission - handle permission denials gracefully
9. **Cross-Origin Isolation**: Forgetting COOP/COEP headers will prevent SharedArrayBuffer from working
10. **MIDI Clock Drift**: Must compensate for clock drift over long sessions (>1 hour)

## Synthesis Parameter Reference

**Key synthesis parameters per drum type:**

**Kick Drum:**
- Pitch (20-200Hz fundamental)
- Pitch envelope amount
- Click oscillator level
- Saturation/drive
- Decay time

**Snare Drum:**
- Body frequency (100-800Hz)
- Noise level
- Body/noise mix
- Filter resonance
- Dual envelope settings

**Hi-Hat:**
- Metallic resonance frequencies
- Noise color (filter cutoff)
- Decay time (closed vs open)
- Choke group assignment

## MIDI Implementation

**GM Drum Map (Standard MIDI Note Numbers):**
- 36: Kick
- 38: Snare
- 42: Closed Hi-Hat
- 46: Open Hi-Hat
- Additional drums as per GM standard

**MIDI Clock:**
- 24 PPQ (pulses per quarter note)
- Transport: Start (0xFA), Stop (0xFC), Continue (0xFB)
- Song Position Pointer for sync

**MIDI Learn:**
- Click any synthesis parameter → move MIDI control → automatic mapping
- Mappings persist in IndexedDB
- Conflict resolution for duplicate CC assignments

## Documentation References

Refer to these files for detailed specifications:
- `prd.md`: Product requirements and user stories
- `technical_docs.md`: Chrome optimization strategies and architecture details
- `implementation.md`: 8-week implementation plan with synthesis and MIDI features
