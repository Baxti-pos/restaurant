let audioContext: AudioContext | null = null;
let unlocked = false;

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
};

export const unlockRealtimeSound = async () => {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    await context.resume();
  }

  unlocked = context.state === 'running';
  return unlocked;
};

const playTone = async (frequency: number, durationMs: number, volume: number, delayMs = 0) => {
  const context = getAudioContext();
  if (!context || !unlocked) {
    return;
  }

  const startAt = context.currentTime + delayMs / 1000;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationMs / 1000 + 0.03);
};

export const playRealtimeSound = async (kind: 'qr-order' | 'service-call') => {
  if (!(await unlockRealtimeSound())) {
    return;
  }

  if (kind === 'service-call') {
    await playTone(880, 140, 0.09);
    await playTone(1174, 180, 0.08, 180);
    return;
  }

  await playTone(659, 120, 0.08);
  await playTone(880, 150, 0.08, 150);
};
