import * as THREE from 'three'

export function identity(id: string) {
  let seed = 2166136261
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 16777619)
  seed >>>= 0
  return { seed, hue: (seed % 360) / 360, sides: 3 + seed % 5, variant: (seed >>> 8) % 4 }
}

export function plate(width: number, height: number, cut: number, depth: number) {
  const w = width / 2, h = height / 2
  const shape = new THREE.Shape()
  shape.moveTo(-w + cut, -h); shape.lineTo(w - cut, -h); shape.lineTo(w, -h + cut)
  shape.lineTo(w, h - cut); shape.lineTo(w - cut, h); shape.lineTo(-w + cut, h)
  shape.lineTo(-w, h - cut); shape.lineTo(-w, -h + cut); shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .03 })
}

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
export function hologram(color: THREE.Color, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAwaken: { value: 0 }, uColor: { value: color }, uSeed: { value: seed % 31 } },
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: vertex,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime,uAwaken,uSeed; uniform vec3 uColor;
      void main(){
        vec2 p=vUv-.5;
        float grid=pow(max(0.,sin((p.x+p.y*.35)*100.+uSeed)),22.);
        float scan=pow(max(0.,1.-abs(fract(vUv.y-uTime*.13)-.5)*2.),30.);
        float edge=pow(max(abs(p.x)*2.,abs(p.y)*2.),14.);
        float hex=pow(abs(sin(p.x*27.+sin(p.y*18.+uSeed))),18.);
        float alpha=(grid*.04+hex*.035+scan*(.09+uAwaken*.34)+edge*.08);
        vec3 base=uColor*.42;
        vec3 gold=vec3(.84,.58,.25);
        vec3 c=mix(base,gold,uAwaken*.72);
        gl_FragColor=vec4(c,alpha*(.72+uAwaken*.28));
      }`,
  })
}

export function nameTexture(name: string, number: number, kicker = 'WINNER', footer = 'CORE / RESULT') {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 1024, 512)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#efd7a4'
  ctx.font = '600 34px monospace'
  ctx.fillText(`${kicker}  /  ${String(number).padStart(2, '0')}`, 512, 78)

  const chars = Array.from(name)
  const lines = chars.length > 13
    ? [chars.slice(0, Math.ceil(chars.length / 2)).join(''), chars.slice(Math.ceil(chars.length / 2)).join('')]
    : [name]

  let size = 122
  do {
    ctx.font = `700 ${size}px "Noto Sans JP", sans-serif`
    if (lines.every((line) => ctx.measureText(line).width < 900)) break
    size -= 3
  } while (size > 42)

  ctx.fillStyle = '#fff8e9'
  ctx.shadowColor = 'rgba(232,197,140,.35)'
  ctx.shadowBlur = 18
  const centerY = lines.length === 1 ? 252 : 205
  lines.forEach((line, index) => ctx.fillText(line, 512, centerY + index * (size + 14)))
  ctx.shadowBlur = 0

  ctx.fillStyle = '#d5bf94'
  ctx.font = '600 28px monospace'
  ctx.fillText(footer, 512, 438)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
