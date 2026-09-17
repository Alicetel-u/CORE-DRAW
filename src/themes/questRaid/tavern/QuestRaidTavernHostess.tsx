import { useEffect, useState } from 'react'
import type { HostessPose } from './questRaidTavernDialogue'

const POSES: Record<HostessPose, string> = {
  idle: new URL('./assets/tavern-hostess-idle.png', import.meta.url).href,
  point: new URL('./assets/tavern-hostess-point.png', import.meta.url).href,
  cheer: new URL('./assets/tavern-hostess-cheer.png', import.meta.url).href,
}

export function QuestRaidTavernHostess({ pose, reduced }: { pose: HostessPose; reduced: boolean }) {
  const [pop, setPop] = useState(false)
  useEffect(() => {
    if (reduced) return
    setPop(true)
    const id = window.setTimeout(() => setPop(false), 160)
    return () => window.clearTimeout(id)
  }, [pose, reduced])
  return <div className={`qrt-hostess${pop ? ' qrt-hostess-pop' : ''}`}>
    <img src={POSES[pose]} alt="" />
  </div>
}