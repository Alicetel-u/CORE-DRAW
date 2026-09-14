export function createSeededRandom(value: string) {
  let seed = 2166136261
  for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  return () => {
    let n = seed += 0x6d2b79f5
    n = Math.imul(n ^ n >>> 15, n | 1)
    n ^= n + Math.imul(n ^ n >>> 7, n | 61)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}
export function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const out = [...values]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
