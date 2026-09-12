import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CinematicState } from '../core/cinematic'

function sector(inner: number, outer: number, angle: number, depth: number) {
  const s=new THREE.Shape(), start=-angle/2, end=angle/2
  s.moveTo(Math.cos(start)*outer,Math.sin(start)*outer)
  s.absarc(0,0,outer,start,end,false)
  s.lineTo(Math.cos(end)*inner,Math.sin(end)*inner)
  s.absarc(0,0,inner,end,start,true);s.closePath()
  return new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:.018,bevelThickness:.018,curveSegments:32})
}
export function CoreReactor({ cinematic:s }: { cinematic:CinematicState }) {
  const shell=useRef<THREE.Group>(null), iris=useRef<THREE.Group>(null), rotor=useRef<THREE.Group>(null)
  const glow=useRef<THREE.MeshBasicMaterial>(null), energy=useRef<THREE.Mesh>(null)
  const core=useRef<THREE.Group>(null)
  const jewel=useRef<THREE.Group>(null), halo=useRef<THREE.Group>(null)
  const crystal=useRef<THREE.MeshStandardMaterial>(null)
  const geometry=useMemo(()=>({outer:sector(1.55,2.3,.92,.36),rim:sector(1.35,1.5,.88,.12),shutter:sector(.22,1.27,.94,.08)}),[])
  const shader=useMemo(()=>new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uPower:{value:.1},uGold:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec3 vP; varying vec3 vN; void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vP; varying vec3 vN;uniform float uTime,uPower,uGold;void main(){
      float bands=sin(vP.y*19.+sin(vP.x*11.+uTime*2.)*2.-uTime*3.);
      float veins=pow(abs(bands),12.);float rim=pow(1.-abs(vN.z),2.);
      vec3 c=mix(vec3(.18,.6,.82),vec3(1.,.58,.16),uGold);
      gl_FragColor=vec4(c*(.4+veins*2.+rim)*uPower,(.25+veins*.5+rim*.2)*min(uPower,1.));}`,
  }),[])
  useEffect(()=>()=>{Object.values(geometry).forEach(g=>g.dispose());shader.dispose()},[geometry,shader])
  useFrame(({clock})=>{
    const idle=s.reduced?0:clock.elapsedTime*.025
    if(core.current){core.current.rotation.set(.08,-.15,0);core.current.scale.setScalar(1-s.formation*.1)}
    const time=s.reduced?0:s.running?s.time:s.winner?s.time:clock.elapsedTime*.35
    if(jewel.current){
      jewel.current.rotation.set(.15+Math.sin(time*.6)*.08,time*.38+s.spin*.09,.12)
      jewel.current.position.z=1.25+s.power*.025
      jewel.current.scale.setScalar((.83+Math.min(s.power,3)*.09)*Math.max(0,1-s.formation*5))
      jewel.current.visible=s.formation<.2
    }
    if(crystal.current){crystal.current.emissiveIntensity=(.65+s.power*.65)*(1-s.silence);crystal.current.emissive.set(s.winner?'#ffb734':'#288aff')}
    if(halo.current){halo.current.rotation.z=-time*.12-s.spin*.06;halo.current.scale.setScalar(1+s.shell*.1)}
    if(shell.current)shell.current.children.forEach((p,i)=>{
      const a=i*Math.PI/3
      p.position.set(Math.cos(a)*s.shell*.65,Math.sin(a)*s.shell*.65,-s.shell*.55)
      p.rotation.set(0,s.shell*.25,a+s.shell*.08)
    })
    if(iris.current)iris.current.children.forEach((p,i)=>{
      const a=i*Math.PI/3
      // Six guided slides share a front plane, with clearance above the housing.
      p.position.set(Math.cos(a)*s.shutter*.82,Math.sin(a)*s.shutter*.82,.56)
      p.rotation.set(0,0,a)
    })
    if(rotor.current)rotor.current.rotation.z=-s.spin*.65-idle
    if(glow.current){glow.current.color.set(s.winner?'#e9bc72':'#91c6d6');glow.current.opacity=.12+Math.min(1,s.power)*.6}
    if(energy.current){energy.current.rotation.y=s.spin*.18+idle;energy.current.scale.setScalar(.58+s.power*.015)}
    shader.uniforms.uTime.value=s.reduced?0:clock.elapsedTime*.25
    shader.uniforms.uPower.value=s.power*(1-s.silence)
    shader.uniforms.uGold.value=s.winner
  })
  return <group ref={core} name="reliquary-core">
    <group ref={jewel} position={[0,0,.8]}>
      <mesh><octahedronGeometry args={[.69,0]}/><meshStandardMaterial ref={crystal} color="#8dcbff" emissive="#288aff" emissiveIntensity={.8} metalness={.72} roughness={.15}/></mesh>
      <mesh scale={1.09}><octahedronGeometry args={[.69,0]}/><meshBasicMaterial color="#b8e6ff" wireframe transparent opacity={.55}/></mesh>
      <mesh rotation={[0,0,Math.PI/4]}><torusGeometry args={[.83,.012,12,192]}/><meshBasicMaterial color="#a6d9ff" transparent opacity={.65}/></mesh>
    </group>
    <group ref={halo} position={[0,0,-.3]}>
      {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI*2/3]}><torusGeometry args={[2.85,.024,12,192,Math.PI*.43]}/><meshBasicMaterial color="#9bcfff" transparent opacity={.7}/></mesh>)}
    </group>
    <mesh position={[0,0,-.45]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[1.8,1.55,.7,12,1,true]}/><meshStandardMaterial color="#252e38" metalness={.88} roughness={.3} side={THREE.DoubleSide}/></mesh>
    <mesh ref={energy} position={[0,0,-.35]} material={shader}><icosahedronGeometry args={[1,4]}/></mesh>
    <group ref={shell}>{Array.from({length:6},(_,i)=><group key={i}>
      <mesh geometry={geometry.outer}><meshStandardMaterial color={i%2?'#252c32':'#373a3d'} metalness={.91} roughness={.26}/></mesh>
      <mesh geometry={geometry.rim} position={[0,0,.25]}><meshStandardMaterial color="#877b61" metalness={.86} roughness={.28}/></mesh>
      <mesh position={[1.89,0,.42]}><boxGeometry args={[.43,.07,.07]}/><meshBasicMaterial color="#7a9daa" transparent opacity={.7}/></mesh>
      <mesh position={[2.05,0,.47]} rotation={[0,Math.PI/2,0]}><cylinderGeometry args={[.14,.14,.17,6]}/><meshStandardMaterial color="#161d23" metalness={.9} roughness={.22}/></mesh>
      {[-1,1].map(sign=><mesh key={sign} position={[1.88,sign*.52,.42]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.07,.07,.08,6]}/><meshStandardMaterial color="#978976" metalness={.8} roughness={.25}/></mesh>)}
    </group>)}</group>
    <group ref={iris}>{Array.from({length:6},(_,i)=><mesh key={i} geometry={geometry.shutter}><meshStandardMaterial color="#354654" metalness={.78} roughness={.3}/></mesh>)}</group>
    <group ref={rotor} position={[0,0,-.1]}>
      <mesh><torusGeometry args={[2.53,.08,12,192]}/><meshStandardMaterial color="#3e4248" metalness={.9} roughness={.28}/></mesh>
      <mesh><torusGeometry args={[2.55,.017,12,192]}/><meshBasicMaterial ref={glow} color="#91c6d6" transparent opacity={.25}/></mesh>
      {Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <group key={i} position={[Math.cos(a)*2.6,Math.sin(a)*2.6,0]} rotation={[0,0,a]}>
        <mesh><boxGeometry args={[.25,.23,.28]}/><meshStandardMaterial color="#222a30" metalness={.8} roughness={.25}/></mesh>
        <mesh position={[.07,0,.16]}><boxGeometry args={[.13,.035,.025]}/><meshBasicMaterial color="#7e9ca6"/></mesh>
      </group>})}
    </group>
  </group>
}
