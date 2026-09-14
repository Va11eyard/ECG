export function estimateFsHz(sampleCount: number, elapsedMs: number): number {
  if (elapsedMs < 400 || sampleCount < 20) return 125;
  const hz = (sampleCount * 1000) / elapsedMs;
  if (hz < 50 || hz > 400) return 125;
  return Math.round(hz);
}
