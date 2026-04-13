/**
 * Chrome often does not play the macOS notification sound for tab-foreground
 * `Notification()` the same way native apps do. A short in-page tone gives
 * immediate feedback without replacing OS settings.
 */
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* autoplay or AudioContext blocked */
  }
}
