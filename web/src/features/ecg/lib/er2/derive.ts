export function einthoven(
  I: Float32Array,
  II: Float32Array,
): { III: Float32Array; aVR: Float32Array; aVL: Float32Array; aVF: Float32Array } {
  const n = Math.min(I.length, II.length);
  const III = new Float32Array(n);
  const aVR = new Float32Array(n);
  const aVL = new Float32Array(n);
  const aVF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = I[i] ?? 0;
    const b = II[i] ?? 0;
    III[i] = b - a;
    aVR[i] = -(a + b) / 2;
    aVL[i] = a - b / 2;
    aVF[i] = b - a / 2;
  }
  return { III, aVR, aVL, aVF };
}

export function applyPolarity(x: Float32Array, invert: boolean): Float32Array {
  if (!invert) return x;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = -(x[i] ?? 0);
  return y;
}
