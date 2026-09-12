import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CinematicState } from '../core/cinematic'
import type { QualityTier } from '../core/types'

/** All effects follow director time, so replay and reduced motion stay deterministic. */
export function SummoningPortal({ cinematic: s, quality }: { cinematic: CinematicState; quality: QualityTier }) {
  const rays = useRef<THREE.InstancedMesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const count = quality === 'lite' ? 32 : quality === 'ultra' ? 112 : 72
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uGold: { value: 0 }, uSilence: { value: 0 }, uReveal: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime,uPower,uGold,uSilence,uReveal;
      float ring(float r,float radius,float width){float aa=max(width,fwidth(r)*.85);return exp(-pow((r-radius)/aa,2.))*width/aa;}
      void main(){
        vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);
        float t=uTime;float power=min(uPower,2.5);
        float ticks=pow(max(0.,cos(a*72.+t*.35)),24.);
        float gates=smoothstep(.15,.35,sin(a*6.-t*.24));
        float glyphs=smoothstep(.2,.4,sin(a*36.+t*.4))*smoothstep(-.3,-.1,sin(a*17.-t*.2));
        float seal=ring(r,.59,.0025)+ring(r,.62,.0015);
        seal+=ring(r,.605,.012)*ticks*.7;
        seal+=ring(r,.72,.002)*gates+ring(r,.745,.003)*gates*.5;
        seal+=ring(r,.675,.012)*glyphs*.6;
        seal+=ring(r,.81,.0018)*.35+ring(r,.8,.009)*pow(max(0.,cos(a*12.-t*.2)),60.);
        float swirl=sin(a*3.+r*22.-t*(.5+power))*.025;
        float corona=ring(r,.53+swirl,.022)*(.3+power*.3);
        float mist=exp(-r*r*5.)*(.08+power*.035);
        float spokes=pow(max(0.,sin(a*9.+sin(r*8.-t)*.4-t*.08)),28.);
        float rays=spokes*exp(-r*3.)*smoothstep(.18,.4,r)*(.12+power*.18);
        vec3 color=mix(vec3(.16,.48,1.),vec3(1.,.57,.12),uGold);
        vec3 white=mix(vec3(.6,.86,1.),vec3(1.,.87,.48),uGold);
        float fade=(1.-uSilence)*mix(1.,.38,uReveal);
        vec3 rgb=(color*(mist+corona+rays)+white*seal*(.35+power*.35))*fade;
        gl_FragColor=vec4(rgb*1.7,clamp((seal+corona+mist+rays)*fade,0.,.85));
      }`,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => {
    const t = s.reduced ? 0 : s.running ? s.time : s.winner ? s.time : clock.elapsedTime * .35
    material.uniforms.uTime.value = t
    material.uniforms.uPower.value = s.power
    material.uniforms.uGold.value = s.winner
    material.uniforms.uSilence.value = s.silence
    material.uniforms.uReveal.value = s.formation
    if (light.current) {
      light.current.intensity = (3 + Math.min(s.power, 3) * 12) * (1 - s.silence)
      light.current.color.set(s.winner ? '#ffb84a' : '#509dff')
    }
    if (rays.current) {
      rays.current.visible = !s.reduced
      const mat = rays.current.material as THREE.MeshBasicMaterial
      mat.color.set(s.winner ? '#ffd789' : '#85caff')
      mat.opacity = Math.min(.7, .12 + s.power * .16) * (1 - s.formation * .92) * (1 - s.silence)
      for (let i = 0; i < count; i++) {
        const seed = (i * .61803398875) % 1
        const a = i * 2.399963 + t * (.06 + s.absorption * .14)
        const travel = (seed + t * (.09 + s.absorption * .4)) % 1
        const radius = s.winner ? 2 + s.wave * (3 + seed * 6) : 2.7 + (1 - travel) * (4 - s.absorption * 2)
        dummy.position.set(Math.cos(a) * radius, Math.sin(a) * radius, -1.1 - seed * 3)
        dummy.rotation.set(0, 0, a - Math.PI / 2)
        dummy.scale.set(.008 + seed * .012, .05 + s.absorption * .75 + s.burst * .9 + seed * .18, 1)
        dummy.updateMatrix()
        rays.current.setMatrixAt(i, dummy.matrix)
      }
      rays.current.instanceMatrix.needsUpdate = true
    }
  })
  return <group name="summoning-portal">
    <mesh position={[0, 0, -1.25]} material={material}><planeGeometry args={[12, 12]} /></mesh>
    <pointLight ref={light} position={[0, 0, 1.3]} distance={9} decay={2} />
    <instancedMesh ref={rays} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  </group>
}
