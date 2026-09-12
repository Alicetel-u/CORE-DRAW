// Includes the opened corner armor. Halos are reserved for the single hero.
export const CARD_WIDTH = 2.8
export const CARD_HEIGHT = 3.8

export function resultLayout(index: number, count: number, portrait: boolean, grouped = false, groupIndex = 0, groupPosition = 0, groupCount = 1, maxGroupSize = 1, groupSize = maxGroupSize) {
  const width = portrait ? 5 : 10
  const height = portrait ? 7 : 6.8

  if (grouped) {
    // Landscape party results can spread each party across a small internal grid instead of
    // forcing every party into one tall vertical column. Keep portrait conservative.
    const maxColumnsPerParty = portrait ? 1 : Math.max(1, Math.floor(8 / Math.max(1, groupCount)))
    const desiredColumnsPerParty = portrait ? 1 : Math.max(1, Math.ceil(maxGroupSize / 3))
    const memberCols = Math.max(1, Math.min(maxGroupSize, maxColumnsPerParty, desiredColumnsPerParty))
    const rows = Math.max(1, Math.ceil(maxGroupSize / memberCols))
    const memberSpacing = CARD_WIDTH + .28
    const groupGap = .62
    const groupBlockWidth = memberCols * memberSpacing
    const totalWidth = groupCount * groupBlockWidth + Math.max(0, groupCount - 1) * groupGap
    const totalHeight = rows * (CARD_HEIGHT + .45)
    const scale = Math.min(.82, width / totalWidth, height / totalHeight)

    const row = Math.floor(groupPosition / memberCols)
    const memberCol = groupPosition % memberCols
    const membersInRow = Math.max(1, Math.min(memberCols, groupSize - row * memberCols))
    const groupCenter = (groupIndex - (groupCount - 1) / 2) * (groupBlockWidth + groupGap) * scale
    const memberOffset = (memberCol - (membersInRow - 1) / 2) * memberSpacing * scale

    return {
      x: groupCenter + memberOffset,
      y: ((rows - 1) / 2 - row) * (CARD_HEIGHT + .45) * scale,
      scale,
    }
  }

  const cols = Math.min(portrait ? 3 : 5, count)
  const rows = Math.ceil(count / cols)
  const scale = Math.min(.82, width / (cols * (CARD_WIDTH + .35)), height / (rows * (CARD_HEIGHT + .45)))
  const col = index % cols
  const row = Math.floor(index / cols)
  const rowCols = Math.min(cols, count - row * cols)
  return {
    x: (col - (rowCols - 1) / 2) * (CARD_WIDTH + .35) * scale,
    y: ((rows - 1) / 2 - row) * (CARD_HEIGHT + .45) * scale,
    scale,
  }
}
