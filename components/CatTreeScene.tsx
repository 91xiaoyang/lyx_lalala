import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, SoftShadows, ContactShadows, Environment, Center, useCursor, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Palette & Materials ---
const PALETTE = {
  appleGreen: '#8db600', // Granny Smith
  peelOuter: '#99c24d',  // Slightly softer clay green
  peelInner: '#fcf6bd',  // Pale yellow clay
  catWhite: '#fdfdfd',
  catOrange: '#ffb347',
  catGrey: '#6c757d',
  catEarPink: '#ffb7b2',
  wood: '#d4a373',
  floorCeramic: '#3e2723', // Dark ceramic base
  leafGreen: '#4c9a2a',
  star: '#ffd700',
  cookie: '#c19a6b',
  red: '#d00000',        // Deep Apple Red
  candyWhite: '#f1faee',
};

// Ceramic Material Helper for that "Glossy Toy" look
const CeramicMaterial = ({ color, roughness = 0.15, ...props }: { color: string, roughness?: number } & any) => (
  <meshStandardMaterial 
    color={color} 
    roughness={roughness} 
    metalness={0.1} 
    envMapIntensity={1.2}
    {...props} 
  />
);

// --- Geometry Components ---

/**
 * Realistic Apple Shape using LatheGeometry
 */
const AppleGeometry = ({ scale = 1 }: { scale?: number }) => {
  const geometry = useMemo(() => {
    const points = [];
    // Create an apple profile curve
    points.push(new THREE.Vector2(0, 0.45)); 
    points.push(new THREE.Vector2(0.15, 0.5)); 
    points.push(new THREE.Vector2(0.4, 0.65)); // Shoulder
    points.push(new THREE.Vector2(0.85, 0.4)); // Upper Middle
    points.push(new THREE.Vector2(0.9, 0.0));  // Equator
    points.push(new THREE.Vector2(0.8, -0.4)); // Lower Middle
    points.push(new THREE.Vector2(0.5, -0.7)); // Bottom curve
    points.push(new THREE.Vector2(0.2, -0.75)); // Bottom dimple start
    points.push(new THREE.Vector2(0, -0.65));   // Bottom center (dip)
    
    const geom = new THREE.LatheGeometry(points, 32);
    geom.computeVertexNormals();
    return geom;
  }, []);

  return <primitive object={geometry} scale={[scale, scale, scale]} />;
};

/**
 * The Green Apple at the top
 */
const GreenAppleTop = () => {
  return (
    <group position={[0, 4.0, 0]}>
      {/* Main Apple Body */}
      <mesh castShadow>
        <AppleGeometry scale={1.0} />
        <CeramicMaterial color={PALETTE.appleGreen} roughness={0.1} />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, 0.6, 0]} rotation={[0.1, 0, 0.2]}>
        <cylinderGeometry args={[0.03, 0.05, 0.5, 8]} />
        <CeramicMaterial color="#3e2723" roughness={0.8} />
      </mesh>
      
      {/* Leaves */}
      <group position={[0, 0.65, 0]}>
          <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, -0.8]}>
            <sphereGeometry args={[0.15, 0.4, 0.05]} />
            <CeramicMaterial color={PALETTE.leafGreen} />
          </mesh>
          <mesh position={[-0.15, 0.05, 0.1]} rotation={[0.2, 0.5, 0.8]} scale={0.8}>
            <sphereGeometry args={[0.15, 0.4, 0.05]} />
            <CeramicMaterial color={PALETTE.leafGreen} />
          </mesh>
      </group>
    </group>
  );
};

/**
 * Small Red Apple for Decoration
 */
const MiniRedApple = (props: any) => (
    <group {...props}>
         <mesh castShadow>
            <AppleGeometry scale={0.35} />
            <CeramicMaterial color={PALETTE.red} />
         </mesh>
         <mesh position={[0, 0.25, 0]} rotation={[0,0,0.2]}>
            <cylinderGeometry args={[0.015, 0.02, 0.15]} />
            <meshStandardMaterial color="#3e2723" />
         </mesh>
    </group>
);

/**
 * The Peel Ribbon connecting to the cat's hand
 * Updated for "Handmade Clay" look: thicker, wobbly vertices
 */
const PeelRibbon = () => {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const points = [];
    const loops = 3.5;
    const startY = 3.5;
    const endY = -1.0; 

    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const angle = t * Math.PI * 2 * loops;
      
      // Add a tiny bit of random noise to the path for "handmade" feel
      let r = 0.5 + t * 2.2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = startY - (t * (startY - endY));

      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const width = 0.7;
  const thickness = 0.14; // Thicker for clay look

  // Apply "Clay Wobble" to geometry vertices
  const applyClayDistortion = (mesh: THREE.Mesh | null) => {
      if (!mesh) return;
      const geo = mesh.geometry;
      // Ensure we only do this once
      if (mesh.userData.distorted) return;
      mesh.userData.distorted = true;

      const pos = geo.attributes.position;
      const vector = new THREE.Vector3();
      
      for (let i = 0; i < pos.count; i++) {
          vector.fromBufferAttribute(pos, i);
          
          // Noise based on position
          const noiseX = Math.sin(vector.y * 3.0) * 0.03;
          const noiseZ = Math.cos(vector.y * 4.5) * 0.03;
          // Thickness variation noise
          const thicknessNoise = Math.sin(vector.y * 10 + vector.x * 5) * 0.01;

          vector.x += noiseX;
          vector.z += noiseZ;
          vector.y += thicknessNoise; // Uneven surface

          pos.setXYZ(i, vector.x, vector.y, vector.z);
      }
      geo.computeVertexNormals();
      pos.needsUpdate = true;
  };

  useLayoutEffect(() => {
      applyClayDistortion(outerRef.current);
      applyClayDistortion(innerRef.current);
  }, [curve]);

  const shapeOuter = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, thickness / 2);
    s.lineTo(-width / 2, thickness / 2);
    s.lineTo(-width / 2, 0);
    return s;
  }, []);

  const shapeInner = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, -thickness / 2);
    s.lineTo(width / 2, -thickness / 2);
    s.lineTo(width / 2, 0);
    s.lineTo(-width / 2, 0);
    s.lineTo(-width / 2, -thickness / 2);
    return s;
  }, []);

  return (
    <group>
      {/* Outer Layer (Green Skin) */}
      <mesh ref={outerRef} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shapeOuter,
            { extrudePath: curve, steps: 120, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 },
          ]}
        />
        <CeramicMaterial color={PALETTE.peelOuter} roughness={0.3} />
      </mesh>

      {/* Inner Layer (Yellow Flesh) */}
      <mesh ref={innerRef} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shapeInner,
            { extrudePath: curve, steps: 120, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 },
          ]}
        />
        <CeramicMaterial color={PALETTE.peelInner} roughness={0.35} />
      </mesh>

      {/* Decorations */}
      <RibbonDecoration curve={curve} t={0.10} type="star" />
      <RibbonDecoration curve={curve} t={0.22} type="cookie" />
      <RibbonDecoration curve={curve} t={0.35} type="bauble" color={PALETTE.red} />
      <RibbonDecoration curve={curve} t={0.48} type="santaHat" />
      <RibbonDecoration curve={curve} t={0.60} type="candy" />
      <RibbonDecoration curve={curve} t={0.72} type="cookie" />
      <RibbonDecoration curve={curve} t={0.85} type="star" />
    </group>
  );
};

const RibbonDecoration = ({ curve, t, type, color = PALETTE.red }: any) => {
  const point = curve.getPointAt(t);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
        ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + t * 10) * 0.1;
    }
  });

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshBasicMaterial color="#ddd" />
      </mesh>
      
      <group position={[0, -0.4, 0]} ref={ref} scale={0.8}>
        {type === 'star' && (
           <mesh castShadow rotation={[0, 0, Math.PI/5]}>
             <cylinderGeometry args={[0.3, 0.3, 0.08, 5]} />
             <CeramicMaterial color={PALETTE.star} emissive={PALETTE.star} emissiveIntensity={0.3} />
           </mesh>
        )}
        
        {type === 'bauble' && (
            <mesh castShadow>
                <sphereGeometry args={[0.25, 32, 32]} />
                <CeramicMaterial color={color} />
            </mesh>
        )}

        {type === 'cookie' && (
            <group rotation={[Math.PI/2, 0, 0]}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
                    <CeramicMaterial color={PALETTE.cookie} roughness={0.4} />
                </mesh>
                <mesh position={[0.1, 0.03, 0.1]}>
                    <sphereGeometry args={[0.04]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
                <mesh position={[-0.08, 0.03, -0.05]}>
                    <sphereGeometry args={[0.04]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
            </group>
        )}

        {type === 'santaHat' && (
            <group rotation={[0, 0, 0.2]}>
                <mesh position={[0, 0.2, 0]}>
                    <coneGeometry args={[0.25, 0.5, 32]} />
                    <CeramicMaterial color={PALETTE.red} />
                </mesh>
                <mesh position={[0, -0.05, 0]}>
                    <torusGeometry args={[0.25, 0.08, 16, 32]} />
                    <CeramicMaterial color="white" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                    <sphereGeometry args={[0.08]} />
                    <CeramicMaterial color="white" roughness={0.5} />
                </mesh>
            </group>
        )}

        {type === 'candy' && (
            <group rotation={[0, 0, Math.PI / 4]}>
                <mesh>
                    <capsuleGeometry args={[0.15, 0.4, 4, 16]} />
                    <CeramicMaterial color={PALETTE.candyWhite} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                     <torusGeometry args={[0.05, 0.02, 8, 16]} />
                     <CeramicMaterial color={PALETTE.red} />
                </mesh>
                <mesh position={[0, -0.25, 0]}>
                     <torusGeometry args={[0.05, 0.02, 8, 16]} />
                     <CeramicMaterial color={PALETTE.red} />
                </mesh>
            </group>
        )}
      </group>
    </group>
  );
}

const CalicoCat = () => {
  const headRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Head Tracking + Bobbing
    if (headRef.current) {
        const baseRotY = Math.sin(t * 1) * 0.1;
        const baseRotZ = Math.sin(t * 2) * 0.05;
        const mouseX = state.pointer.x * 0.6; 
        const mouseY = state.pointer.y * 0.3;

        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, baseRotY + mouseX, 0.1);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -mouseY, 0.1);
        headRef.current.rotation.z = baseRotZ;
    }
    
    // Body Breathing & Swaying
    if (bodyRef.current) {
        // Vertical breathing
        bodyRef.current.position.y = -1.8 + Math.sin(t * 2) * 0.03; 
        // Side-to-side sway (shimmy)
        bodyRef.current.rotation.z = Math.sin(t * 1.5) * 0.04;
    }

    // Tail Wagging
    if (tailRef.current) {
        // Complex wag: main sweep + tip flick
        tailRef.current.rotation.y = Math.sin(t * 3) * 0.3;
        tailRef.current.rotation.x = -0.5 + Math.sin(t * 5) * 0.05; 
    }

    // Arm Animation (One arm waving/holding, one stable)
    if (leftArmRef.current) {
       // Gentle wave/adjusting grip
       leftArmRef.current.rotation.z = 2.5 + Math.sin(t * 2.5) * 0.15;
    }
  });

  return (
    <group ref={bodyRef} position={[0, -1.8, 0]}>
      {/* Body */}
      <group>
        <mesh position={[0, 0.6, 0]} castShadow>
          <capsuleGeometry args={[0.75, 0.9, 4, 16]} />
          <CeramicMaterial color={PALETTE.catWhite} />
        </mesh>
        <mesh position={[0.4, 0.6, -0.3]} rotation={[0,0,-0.2]}>
           <sphereGeometry args={[0.45, 16, 16]} />
           <CeramicMaterial color={PALETTE.catOrange} />
        </mesh>
        <mesh position={[-0.4, 0.4, 0.2]}>
           <sphereGeometry args={[0.35, 16, 16]} />
           <CeramicMaterial color={PALETTE.catGrey} />
        </mesh>
      </group>

      {/* Head */}
      <group position={[0, 1.35, 0]} ref={headRef}>
          <mesh castShadow>
            <sphereGeometry args={[0.9, 32, 32]} />
            <CeramicMaterial color={PALETTE.catWhite} />
          </mesh>
          <mesh position={[-0.4, 0.4, 0.5]}>
             <sphereGeometry args={[0.4, 16, 16]} />
             <CeramicMaterial color={PALETTE.catOrange} />
          </mesh>
           <mesh position={[0.4, 0.5, -0.2]}>
             <sphereGeometry args={[0.4, 16, 16]} />
             <CeramicMaterial color={PALETTE.catGrey} />
          </mesh>
          
          {/* Ears */}
          <group position={[0, 0.75, 0]}>
             <mesh position={[-0.55, 0, 0]} rotation={[0, 0, 0.6]}>
                 <coneGeometry args={[0.28, 0.6, 32]} />
                 <CeramicMaterial color={PALETTE.catWhite} />
             </mesh>
             <mesh position={[-0.55, -0.05, 0.05]} rotation={[0, 0, 0.6]}>
                 <coneGeometry args={[0.18, 0.4, 32]} />
                 <meshStandardMaterial color={PALETTE.catEarPink} />
             </mesh>
             <mesh position={[0.55, 0, 0]} rotation={[0, 0, -0.6]}>
                 <coneGeometry args={[0.28, 0.6, 32]} />
                 <CeramicMaterial color={PALETTE.catGrey} />
             </mesh>
             <mesh position={[0.55, -0.05, 0.05]} rotation={[0, 0, -0.6]}>
                 <coneGeometry args={[0.18, 0.4, 32]} />
                 <meshStandardMaterial color={PALETTE.catEarPink} />
             </mesh>
          </group>

          {/* Face */}
          <group position={[0, 0.1, 0.82]}>
             <mesh position={[-0.28, 0.1, 0]}>
                 <sphereGeometry args={[0.09, 32, 32]} />
                 <CeramicMaterial color="#222" roughness={0.1} />
             </mesh>
             <mesh position={[0.28, 0.1, 0]}>
                 <sphereGeometry args={[0.09, 32, 32]} />
                 <CeramicMaterial color="#222" roughness={0.1} />
             </mesh>
             <mesh position={[0, 0, 0.05]}>
                 <sphereGeometry args={[0.06, 16, 16]} />
                 <CeramicMaterial color={PALETTE.catEarPink} />
             </mesh>
             <mesh position={[-0.1, -0.1, 0]} rotation={[0,0,-0.5]}>
                <capsuleGeometry args={[0.02, 0.15]} />
                <meshBasicMaterial color="#333" />
             </mesh>
             <mesh position={[0.1, -0.1, 0]} rotation={[0,0,0.5]}>
                <capsuleGeometry args={[0.02, 0.15]} />
                <meshBasicMaterial color="#333" />
             </mesh>
             <mesh position={[-0.45, -0.05, -0.05]}>
                 <circleGeometry args={[0.12, 32]} />
                 <meshBasicMaterial color="#ffb7b2" transparent opacity={0.4} />
             </mesh>
             <mesh position={[0.45, -0.05, -0.05]}>
                 <circleGeometry args={[0.12, 32]} />
                 <meshBasicMaterial color="#ffb7b2" transparent opacity={0.4} />
             </mesh>
          </group>
      </group>

      {/* Left Arm (Active) */}
      <group ref={leftArmRef} position={[0.6, 0.8, 0]} rotation={[0, 0, 2.5]}>
         <mesh castShadow>
             <capsuleGeometry args={[0.22, 0.9, 4, 16]} />
             <CeramicMaterial color={PALETTE.catWhite} />
         </mesh>
         <mesh position={[0, 0.4, 0]}>
             <sphereGeometry args={[0.23]} />
             <CeramicMaterial color={PALETTE.catWhite} />
         </mesh>
      </group>

      {/* Right Arm (Support) */}
      <group ref={rightArmRef} position={[-0.7, 0.6, 0.3]} rotation={[0, 0, -2.0]}>
         <mesh castShadow>
             <capsuleGeometry args={[0.22, 0.7, 4, 16]} />
             <CeramicMaterial color={PALETTE.catWhite} />
         </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.3, 0.1, 0.3]} rotation={[0, 0, 0]} castShadow>
         <capsuleGeometry args={[0.24, 0.6, 4, 16]} />
         <CeramicMaterial color={PALETTE.catWhite} />
      </mesh>
      <group position={[0.4, 0.3, 0.4]} rotation={[-0.5, 0, -0.5]}>
         <mesh castShadow>
             <capsuleGeometry args={[0.24, 0.6, 4, 16]} />
             <CeramicMaterial color={PALETTE.catOrange} />
         </mesh>
          <mesh position={[0, -0.3, 0.1]}>
             <sphereGeometry args={[0.24]} />
             <CeramicMaterial color={PALETTE.catWhite} />
         </mesh>
      </group>

      {/* Tail */}
      <group ref={tailRef} position={[0, 0.3, -0.6]} rotation={[-0.5, 0, 0]}>
          <mesh position={[0, 0.4, -0.2]}> 
             {/* Offset the tail geometry so we rotate from the base */}
              <tubeGeometry args={[new THREE.CatmullRomCurve3([
                  new THREE.Vector3(0, -0.4, 0.2), // Base
                  new THREE.Vector3(0, 0.1, -0.2),
                  new THREE.Vector3(0.3, 0.4, 0.0) // Tip
              ]), 20, 0.12, 8, false]} />
              <CeramicMaterial color={PALETTE.catGrey} />
          </mesh>
      </group>
    </group>
  );
};

const Floor = () => (
    <group position={[0, -2, 0]}>
         {/* Main ceramic base - Darker, High Gloss */}
        <mesh receiveShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[3.8, 4.0, 0.25, 64]} />
            <CeramicMaterial color={PALETTE.floorCeramic} roughness={0.1} metalness={0.2} />
        </mesh>
        
        {/* Scattered Decor: Lifted Y position to fix clipping (0.2 -> 0.55) */}
        <group position={[2.2, 0.55, 1]}>
             <MiniRedApple rotation={[0, 0, 0.2]} scale={0.7} />
        </group>

        <group position={[1.5, 0.55, 2.0]}>
             <MiniRedApple rotation={[0, 0, -0.2]} scale={0.65} />
        </group>
        
        {/* Candy on floor */}
        <group position={[-1.2, 0.25, 1.8]} rotation={[0, 0.5, 1.57]}>
            <mesh>
                 <capsuleGeometry args={[0.2, 0.5, 4, 16]} />
                 <CeramicMaterial color={PALETTE.candyWhite} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
                 <torusGeometry args={[0.06, 0.025, 8, 16]} />
                 <CeramicMaterial color={PALETTE.red} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
                 <torusGeometry args={[0.06, 0.025, 8, 16]} />
                 <CeramicMaterial color={PALETTE.red} />
            </mesh>
        </group>

        <group position={[-2.2, 0.3, 0.5]} rotation={[0, 1, 0]}>
             <mesh castShadow>
                 <boxGeometry args={[0.6, 0.6, 0.6]} />
                 <CeramicMaterial color={PALETTE.red} />
             </mesh>
             <mesh position={[0, 0.31, 0]} rotation={[0,0,0]}>
                 <cylinderGeometry args={[0.12, 0.12, 0.6, 16]} rotation={[0,0,Math.PI/2]} />
                 <CeramicMaterial color={PALETTE.star} />
             </mesh>
        </group>
    </group>
)

const SnowBase = () => {
    // A soft fading disc under the floor to blend it into the dark background
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]}>
        <circleGeometry args={[8, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{
            color: { value: new THREE.Color('#0b1026') }, 
            centerColor: { value: new THREE.Color('#e0f7fa') }, // Snow color
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform vec3 color;
            uniform vec3 centerColor;
            void main() {
              float dist = distance(vUv, vec2(0.5));
              // Create a soft gradient from center (0) to edge (0.5)
              float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
              
              // Fade color slightly towards the edge color before transparency kicks in fully
              vec3 finalColor = mix(centerColor, color, dist * 2.0);
              
              gl_FragColor = vec4(finalColor, alpha * 0.8); 
            }
          `}
        />
      </mesh>
    );
};

const RotatingTree = ({ children }: { children?: React.ReactNode }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.15; // Slow rotation
        }
    });
    return <group ref={ref}>{children}</group>;
}

const Snow = () => {
    return (
        <group>
            {/* Fine background glow/dust */}
            <Sparkles count={200} scale={[15, 10, 15]} size={3} speed={0.3} opacity={0.5} color="#ffffff" />
            {/* Larger glowing flakes drifting */}
            <Sparkles count={80} scale={[12, 12, 12]} size={8} speed={0.6} opacity={0.8} color="#e0f7fa" noise={2} />
        </group>
    )
}

// --- Main Scene ---

export const CatTreeScene = () => {
  return (
    <Canvas shadows camera={{ position: [0, 2, 11], fov: 45 }} dpr={[1, 2]}>
      {/* Deep Midnight Blue Background */}
      <color attach="background" args={['#0b1026']} />
      
      {/* Lighting for Dark Mode */}
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight 
        position={[3, 8, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      {/* Rim light for drama */}
      <spotLight position={[-5, 5, -5]} intensity={2.0} color="#b3e5fc" angle={0.6} penumbra={1} />
      {/* Warm fill */}
      <pointLight position={[0, 1, 3]} intensity={0.5} color="#ffd1dc" />
      
      <Environment preset="night" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <group position={[0, -0.5, 0]}>
        <Center>
            <group rotation={[0, -0.2, 0]}>
                <RotatingTree>
                    <GreenAppleTop />
                    <PeelRibbon />
                </RotatingTree>
                <CalicoCat />
                <Floor />
                <SnowBase />
            </group>
        </Center>
      </group>

      <Snow />

      <ContactShadows opacity={0.5} scale={20} blur={2} far={4} color="#000" />
      
      <OrbitControls 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2.1} 
        enablePan={false}
        autoRotate={false} 
      />
    </Canvas>
  );
};
