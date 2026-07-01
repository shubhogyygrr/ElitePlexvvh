// Cinematic Sound Effects Generator using Web Audio API
// No static asset loading needed - fully dynamic and high performance.

import { safeLocalStorage as localStorage } from './safeStorage';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  const AudioCtxClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API (AudioContext) is not supported in this environment');
  }
  if (!audioCtx) {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem('elitesound_enabled') !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem('elitesound_enabled', enabled ? 'true' : 'false');
  } catch (err) {
    console.error("Failed to persist sound preference:", err);
  }
}

/**
 * Play a beautiful, short cinematic tactile tick sound.
 */
export function playInterfaceTick() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Synthesize premium high-end transient tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Frequency sweep from high to low for punchy click
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (err) {
    // Graceful fallback if Web Audio API not supported
    console.warn("Audio Context block or unsupported:", err);
  }
}

/**
 * Play an atmospheric cinematic swell/woosh sound for page/tab transitions.
 */
export function playCinematicSwell() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Warm low-frequency sub wooosh
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, now);
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.4);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.49);
    filter.Q.setValueAtTime(3, now);
    
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn("Audio Context error:", err);
  }
}

/**
 * Play a gorgeous luxury golden chime/chord for success states.
 */
export function playGoldenSuccessChime() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // A beautiful major pentatonic chord (Root, Major 3rd, Fifth, Major 6th, Octave)
    // Frequencies: C4 (261.63), E4 (329.63), G4 (392.00), A4 (440.00), C5 (523.25)
    const freqs = [261.63, 329.63, 392.00, 440.00, 523.25];
    const duration = 1.6;
    
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delayTime = idx * 0.08; // Arpeggiate
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Add subtle vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 6.0; // 6Hz
      lfoGain.gain.value = 4.0;  // 4Hz depth
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0, now + delayTime);
      gain.gain.linearRampToValueAtTime(0.06, now + delayTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delayTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      lfo.start(now + delayTime);
      osc.start(now + delayTime);
      
      lfo.stop(now + delayTime + duration);
      osc.stop(now + delayTime + duration);
    });
  } catch (err) {
    console.warn("Audio Context error:", err);
  }
}

/**
 * Play a futuristic rising/falling double-beep when sound is toggled.
 */
export function playToggleBeep(enabled: boolean) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    
    if (enabled) {
      // Rising double-beep
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(440, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.09);
    } else {
      // Falling double-beep
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      osc.frequency.setValueAtTime(330, now + 0.09);
    }
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn("Audio Context error:", err);
  }
}
