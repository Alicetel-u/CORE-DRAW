export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O']

export function createBingo() {
  const balls = Array.from({ length: 75 }, (_, i) => i + 1)
  const bytes = new Uint32Array(1)
  // Rejection sampling prevents modulo bias in Fisher–Yates choices.
  for (let i = balls.length - 1; i > 0; i--) {
    const limit = 4294967296 - 4294967296 % (i + 1)
    do { crypto.getRandomValues(bytes) } while (bytes[0] >= limit)
    const j = bytes[0] % (i + 1)
    ;[balls[i], balls[j]] = [balls[j], balls[i]]
  }
  // Fix the full sequence before any animation starts.
  return { balls }
}
