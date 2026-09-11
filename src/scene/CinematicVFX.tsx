import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CinematicState } from '../core/cinematic'
import type { QualityTier } from '../core/types'

export function CinematicVFX({ cinematic:s, quality }: {cinematic:CinematicState;quality:QualityTier}) {
  const shock=useRef<THREE.Mesh>(null)
  const debris=useRef<THREE.InstancedMesh>(null)
  const count=quality==='ultra'?2600:quality==='high'?1200:300
  const shards=quality==='ultra'?90:quality==='high'?45:14
  const scratch=useMemo(()=>new THREE.Object3D(),[])
  const particles=useMemo(()=>{
    const geometry=new THREE.BufferGeometry(), positions=new Float32Array(count*3), seed=new Float32Array(count)
    for(let i=0;i<count;i++){const a=i*2.399963,r=2+(i%101)/101*10;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.sin(a)*r*.7;positions[i*3+2]=-1-(i%41)/4;seed[i]=(i*.618034)%1}
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seed,1))
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uPull:{value:0},uBurst:{value:0},uWave:{value:0},uAwaken:{value:0},uSilence:{value:0},uDpr:{value:1}},
      vertexShader:`attribute float aSeed;uniform float uTime,uPull,uBurst,uWave,uAwaken,uDpr;varying float vAlpha,vGold;void main(){
        vec3 p=position; float a=uTime*(.025+uPull*.8);mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));p.xy=r*p.xy;
        float stream=fract(aSeed+uTime*(.04+uPull*.7));
        p=mix(p,p*(1.-stream),uPull);p*=1.-uPull*.7;
        p+=normalize(position)*uWave*12.*uBurst;
        if(uAwaken>.01 && aSeed<.3){float angle=aSeed*70.;p=mix(p,vec3(cos(angle)*(1.8+aSeed),sin(angle)*2.4,2.8+sin(angle)*.25),uAwaken);}
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=min(14.,(12.+aSeed*12.+uPull*20.)*uDpr/max(1.,-mv.z));
        vAlpha=(.2+aSeed*.6)*(1.-uPull*.75);vGold=max(uAwaken,uBurst);
      }`,
      fragmentShader:`varying float vAlpha,vGold;uniform float uSilence;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;float a=pow(1.-d*2.,2.);vec3 c=mix(vec3(.43,.64,.76),vec3(1.,.72,.32),vGold);gl_FragColor=vec4(c*1.6,a*vAlpha*(1.-uSilence));}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    })
    return {geometry,material}
  },[count])
  const wave=useMemo(()=>new THREE.ShaderMaterial({
    uniforms:{uOpacity:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uOpacity;void main(){float r=length(vUv-.5)*2.;float ring=exp(-pow((r-.77)*45.,2.));float trail=exp(-pow((r-.70)*12.,2.))*.23;gl_FragColor=vec4(vec3(1.,.7,.34)*1.8,(ring+trail)*uOpacity);}`,
  }),[])
  useEffect(()=>()=>{particles.geometry.dispose();particles.material.dispose()},[particles])
  useEffect(()=>()=>wave.dispose(),[wave])
  useFrame(({clock,gl})=>{
    const u=particles.material.uniforms
    u.uTime.value=s.reduced?0:s.running?s.time:clock.elapsedTime*.2
    u.uPull.value=s.winner?0:s.absorption
    u.uBurst.value=s.reduced?0:s.burst;u.uWave.value=s.wave
    u.uAwaken.value=s.awaken;u.uSilence.value=s.silence;u.uDpr.value=gl.getPixelRatio()
    if(shock.current){shock.current.visible=!s.reduced&&s.wave>0&&s.wave<1;shock.current.scale.setScalar(1+s.wave*22)}
    wave.uniforms.uOpacity.value=(1-s.wave)*1.5
    if(debris.current){
      debris.current.visible=!s.reduced&&s.burst>.01
      for(let i=0;i<shards;i++){
        const a=i*2.39996,spread=1+s.wave*(3+i%4)
        scratch.position.set(Math.cos(a)*spread,Math.sin(a)*spread*.8,Math.sin(i*17)*spread*.5)
        scratch.rotation.set(i+s.wave*4,i*.7,i+s.wave*2);scratch.scale.setScalar((.025+(i%4)*.017)*s.burst)
        scratch.updateMatrix();debris.current.setMatrixAt(i,scratch.matrix)
      }
      debris.current.instanceMatrix.needsUpdate=true
    }
  })
  return <group name="cinematic-vfx">
    <points geometry={particles.geometry} material={particles.material} frustumCulled={false}/>
    <mesh ref={shock} position={[0,0,1]} material={wave} visible={false}><planeGeometry args={[2,2]}/></mesh>
    <instancedMesh ref={debris} args={[undefined,undefined,shards]} frustumCulled={false} visible={false}><tetrahedronGeometry args={[1]}/><meshStandardMaterial color="#b6a181" metalness={.8} roughness={.25} emissive="#9b7030" emissiveIntensity={.25}/></instancedMesh>
  </group>
}
