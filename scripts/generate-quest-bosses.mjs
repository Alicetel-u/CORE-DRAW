// Regenerating overwrites hand-authored SNES-style boss art in src/themes/questRaid/bosses/.
// Keep this file only as a last-resort fallback. Do not run it unless those PNGs are missing.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
const root = new URL('../src/themes/questRaid/bosses/', import.meta.url)
mkdirSync(root, { recursive: true })
function crc32(data) { let c = -1; for (const b of data) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0) } return (c ^ -1) >>> 0 }
function chunk(type, data) { const tag = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4); size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data]))); return Buffer.concat([size, tag, data, crc]) }
for (const [index, id] of ['dark-lord', 'dragon', 'knight', 'demon', 'abomination'].entries()) {
  const pixels = Buffer.alloc(128 * 128 * 4)
  const palettes = [ ['#201830','#51376b','#9863ba','#e9aa55'], ['#142d38','#24666a','#4ba78c','#c5dfa1'], ['#161c30','#394763','#7a94aa','#d5e3e8'], ['#321d31','#703451','#c55b69','#f4ba78'], ['#231e47','#514587','#9786c2','#d7e695'] ]
  const palette = palettes[index]
  function rect(x,y,w,h,color) { const rgb = color.match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16)); for(let yy=Math.max(0,y);yy<Math.min(128,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(128,x+w);xx++){ const p=(yy*128+xx)*4;pixels[p]=rgb[0];pixels[p+1]=rgb[1];pixels[p+2]=rgb[2];pixels[p+3]=255 } }
  function r(x,y,w,h,c) { rect(x*2,y*2,w*2,h*2,palette[c]) }
  // Each silhouette is authored separately on a 64 x 64 pixel grid.
  if (index === 0) {
    for(let y=17;y<55;y++) { const w=Math.floor((y-10)*.55);r(32-w,y,w*2,1,1);r(32-w,y,3,1,0) }
    r(25,12,14,15,2);r(23,8,3,11,3);r(30,6,3,8,3);r(38,8,3,11,3);r(27,17,10,7,0)
    r(29,18,2,2,3);r(35,18,2,2,3);r(30,30,5,18,3);r(48,14,2,43,3);r(45,10,8,7,2);r(20,31,8,5,2);r(38,31,10,5,2)
  } else if (index === 1) {
    for(let y=15;y<40;y++){const w=Math.floor((40-y)*.6);r(5,y,w,1,1);r(59-w,y,w,1,1)}
    r(9,14,2,25,2);r(53,14,2,25,2);r(23,30,20,20,1);r(29,20,13,23,2);r(30,14,18,12,1);r(42,21,10,6,2)
    r(31,10,3,8,3);r(40,9,3,9,3);r(40,17,3,2,3);r(33,32,7,14,3);r(18,49,13,5,2);r(38,49,11,5,2)
    for(let i=0;i<14;i++) r(13+i,48-Math.floor(i/3),4,4,1)
  } else if (index === 2) {
    r(23,12,18,17,1);r(26,9,12,4,2);r(26,19,13,4,0);r(28,20,9,1,3);r(30,12,3,6,3)
    r(19,30,25,19,1);r(23,31,17,5,2);r(29,36,6,10,3);r(21,49,8,9,2);r(36,49,8,9,2)
    r(9,30,13,19,2);r(12,33,7,12,0);r(14,36,3,6,3);r(48,8,3,32,3);r(44,37,11,3,2);r(48,40,3,9,1)
  } else if (index === 3) {
    for(let y=15;y<38;y++){r(5+Math.floor((y-15)/2),y,10,1,1);r(49-Math.floor((y-15)/2),y,10,1,1)}
    r(23,29,19,20,1);r(24,14,17,16,2);r(20,8,4,13,3);r(41,8,4,13,3);r(27,20,3,2,3);r(35,20,3,2,3);r(30,25,5,2,0)
    r(28,33,10,10,2);r(17,35,7,5,2);r(42,35,7,5,2);r(21,48,8,8,2);r(36,48,8,8,2)
  } else {
    for(let y=15;y<46;y++){const w=Math.floor(Math.sqrt(Math.max(0,225-(y-30)**2)));r(32-w,y,w*2,1,1)}
    for(let arm=0;arm<7;arm++)for(let k=0;k<15;k++){const x=12+arm*6+Math.round(Math.sin(k*.45+arm)*3);r(x,40+k,4,3,k%4===0?2:1)}
    r(22,24,20,10,2);r(25,26,14,6,3);r(31,24,4,10,0);r(15,18,5,5,3);r(44,18,5,5,3);r(27,38,3,3,3);r(36,38,3,3,3)
  }
  const raw=Buffer.alloc(128*(128*4+1)); for(let y=0;y<128;y++)pixels.copy(raw,y*513+1,y*512,(y+1)*512)
  const header=Buffer.alloc(13);header.writeUInt32BE(128,0);header.writeUInt32BE(128,4);header[8]=8;header[9]=6
  writeFileSync(new URL(`boss-${id}.png`,root),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]))
}
console.log('Generated 5 original 128 x 128 pixel bosses.')
