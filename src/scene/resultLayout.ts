// Includes the opened corner armor. Halos are reserved for the single hero.
export const CARD_WIDTH = 2.8
export const CARD_HEIGHT = 3.8
export function resultLayout(index: number, count: number, portrait: boolean, grouped = false, groupIndex = 0, groupPosition = 0, groupCount = 1, maxGroupSize = 1) {
  const cols = grouped ? groupCount : Math.min(portrait ? 3 : 5, count)
  const rows = grouped ? maxGroupSize : Math.ceil(count / cols)
  const width = portrait ? 5 : 10
  const height = portrait ? 7 : 6.8
  const scale = Math.min(.82, width / (cols * (CARD_WIDTH + .35)), height / (rows * (CARD_HEIGHT + .45)))
  const col = grouped ? groupIndex : index % cols
  const row = grouped ? groupPosition : Math.floor(index / cols)
  const rowCols = grouped ? cols : Math.min(cols, count - row * cols)
  return { x: (col - (rowCols - 1) / 2) * (CARD_WIDTH + .35) * scale,
    y: ((rows - 1) / 2 - row) * (CARD_HEIGHT + .45) * scale, scale }
}
