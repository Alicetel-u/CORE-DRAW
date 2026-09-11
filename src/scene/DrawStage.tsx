import { Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Component, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { DrawPhase, Participant, QualityTier } from '../core/types'
import { CoreReactor } from './CoreReactor'
import { ParticipantCard } from './ParticipantCard'

function Motion({ phase, reduced }: { phase: DrawPhase; reduced: boolean }) {
  const target = useMemo(()=>new THREE.Vector3(),[])
  useFrame(({camera,clock},dt)=>{
    const z = phase==='selection'?10:phase==='mixing'?12:phase==='impact'?15:14
    target.set(reduced?0:Math.sin(clock.elapsedTime*.17)*.3, .3, z)
    camera.position.lerp(target,1-Math.exp(-dt*2))
    camera.lookAt(0,0,0)
  })
  return null
}
function Dust({ phase, lite }: { phase: DrawPhase; lite: boolean }) {
  const ref=useRef<THREE.Points>(null)
  const positions=useMemo(()=>{
    const a=new Float32Array((lite?180:650)*3)
    for(let i=0;i<a.length;i+=3){const n=i/3; const angle=n*2.399963;const r=3+(n%97)/97*8;a[i]=Math.cos(angle)*r;a[i+1]=Math.sin(angle)*r*.65;a[i+2]=-2-(n%31)/3}
    return a
  },[lite])
  useFrame((_,dt)=>{if(ref.current) ref.current.rotation.z+=dt*(phase==='mixing'?.2:.012)})
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial size={.022} color={['reveal','complete'].includes(phase)?'#ffd99d':'#7eb8ce'} transparent opacity={.65} sizeAttenuation /></points>
}
class StageBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<div className="fallback-core"><span>◇</span><small>CORE ONLINE · 2D MODE</small></div>:this.props.children}
}
export function DrawStage({ participants, phase, quality='high', reduced=false }: { participants: Participant[]; phase: DrawPhase; winnerIds: string[]; quality?: QualityTier; reduced?: boolean }) {
  return <StageBoundary><Canvas dpr={quality==='ultra'?[1,2]:quality==='high'?[1,1.5]:[.75,1]} camera={{position:[0,.3,14],fov:43}} gl={{antialias:quality!=='lite',alpha:true}} fallback={<div className="fallback-core"><span>◇</span><small>2D MODE</small></div>}>
    <ambientLight intensity={.7}/><pointLight position={[3,4,5]} intensity={25} color="#b7eaff"/><pointLight position={[-4,-2,1]} intensity={15} color="#527b9e"/>
    <Motion phase={phase} reduced={reduced}/>
    <Stars radius={45} depth={30} count={quality==='lite'?350:1000} factor={1.4} fade speed={reduced?0:.15}/>
    <Dust phase={reduced?'idle':phase} lite={quality==='lite'}/>
    <CoreReactor phase={phase} reduced={reduced}/>
    {participants.map((p,i)=><ParticipantCard key={p.id} participant={p} index={i} total={participants.length} phase={reduced&&phase==='mixing'?'charging':phase} isWinner={false}/>)}
    {quality!=='lite'&&<EffectComposer multisampling={0}><Bloom intensity={phase==='impact'?2: .85} luminanceThreshold={.65} mipmapBlur/><Vignette offset={.15} darkness={.65}/></EffectComposer>}
  </Canvas></StageBoundary>
}
