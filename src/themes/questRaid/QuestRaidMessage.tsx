export function QuestRaidMessage({ message, age, reduced }: { message: string; age: number; reduced: boolean }) {
  const chars = Array.from(message)
  return <div className="qr-message qr-window" aria-label={message}><span aria-hidden="true">{reduced ? message : chars.slice(0, Math.max(1, Math.floor(age / 16))).join('')}</span></div>
}
