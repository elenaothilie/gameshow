let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gainValue = 0.08
) {
  const context = getContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + durationMs / 1000);
}

export function playBuzzerSound() {
  playTone(220, 120, "square", 0.09);
}

export function playCorrectSound() {
  playTone(880, 120, "sine", 0.07);
  setTimeout(() => playTone(1175, 120, "sine", 0.07), 120);
}

export function playWrongSound() {
  playTone(196, 220, "sawtooth", 0.08);
}
