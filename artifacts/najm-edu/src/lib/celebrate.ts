import confetti from "canvas-confetti";

export function burstConfetti() {
  confetti({
    particleCount: 55,
    spread: 65,
    origin: { y: 0.7 },
    colors: ["#16a34a", "#22c55e", "#4ade80", "#f59e0b", "#fbbf24"],
    scalar: 0.9,
    gravity: 1.1,
    ticks: 180,
    disableForReducedMotion: true,
  });
}

export function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  } catch {
  }
}

export function celebrate() {
  burstConfetti();
  playSuccessSound();
}
