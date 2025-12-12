import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, ContactShadows, Environment, Center, Stars } from '@react-three/drei';
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
  // Removed static blushRed, using dynamic color blending
};

// Ceramic Material Helper for that "Glossy Toy" look
const CeramicMaterial = ({ color, roughness = 0.15, ...props }: { color: string, roughness?: number } & any) => (
  <meshStandardMaterial 
    color={color} 
    roughness={roughness} 
    metalness={0.1} 
    envMapIntensity={1.0}
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
    
    // OPTIMIZATION: Reduced segments from 32 to 16 for mobile safety
    const geom = new THREE.LatheGeometry(points, 16);
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
        <cylinderGeometry args={[0.03, 0.05, 0.5, 6]} />
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

    // OPTIMIZATION: Reduced steps for mobile
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
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

  // Switch to useEffect to avoid blocking painting on slow devices
  useEffect(() => {
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
            // OPTIMIZATION: Reduced steps and bevel segments
            { extrudePath: curve, steps: 60, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 },
          ]}
        />
        <CeramicMaterial color={PALETTE.peelOuter} roughness={0.3} />
      </mesh>

      {/* Inner Layer (Yellow Flesh) */}
      <mesh ref={innerRef} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shapeInner,
            { extrudePath: curve, steps: 60, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 },
          ]}
        />
        <CeramicMaterial color={PALETTE.peelInner} roughness={0.35} />
      </mesh>

      {/* Decorations - Distributed along the curve */}
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
  // Get point on curve
  const point = curve.getPointAt(t);
  
  // Calculate outward normal vector
  // This pushes the ornament to the outer edge of the ribbon
  const offsetDir = useMemo(() => new THREE.Vector3(point.x, 0, point.z).normalize(), [point]);
  
  // FIXED: 
  // 1. Reduced scalar from 0.38 to 0.22. 
  //    Ribbon width is 0.7 (edge at 0.35). 0.22 ensures the string comes out OF the ribbon surface,
  //    not floating in air.
  // 2. 0.22 is also chosen to avoid hitting the ribbon loop directly below (which starts approx 0.28 units out).
  const pos = useMemo(() => point.clone().add(offsetDir.multiplyScalar(0.22)), [point, offsetDir]);

  const groupRef = useRef<THREE.Group>(null);
  
  // Random phase to make swings asynchronous
  const randomPhase = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      // Compound Pendulum Swing
      const swingX = Math.sin(time * 2.5 + randomPhase) * 0.15; 
      const swingZ = Math.cos(time * 2.0 + randomPhase) * 0.1;
      
      groupRef.current.rotation.x = swingX;
      groupRef.current.rotation.z = swingZ;
    }
  });

  return (
    <group position={[pos.x, pos.y, pos.z]} ref={groupRef}>
      {/* Connector: Small clay blob to visually attach string to ribbon */}
      <mesh position={[0, 0, 0]}>
         <sphereGeometry args={[0.04]} />
         <CeramicMaterial color="#e5e7eb" />
      </mesh>

      {/* The String hanging from the ribbon edge */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3]} />
        <meshBasicMaterial color="#e5e7eb" /> 
      </mesh>
      
      {/* The Ornament Hanging at the end of the string */}
      <group position={[0, -0.3, 0]} scale={0.8}>
        {type === 'star' && (
           <mesh castShadow rotation={[0, 0, Math.PI/5]}>
             <cylinderGeometry args={[0.3, 0.3, 0.08, 5]} />
             <CeramicMaterial color={PALETTE.star} emissive={PALETTE.star} emissiveIntensity={0.3} />
           </mesh>
        )}
        
        {type === 'bauble' && (
            <mesh castShadow>
                <sphereGeometry args={[0.25, 24, 24]} />
                <CeramicMaterial color={color} />
            </mesh>
        )}

        {type === 'cookie' && (
            <group rotation={[Math.PI/2, 0, 0]}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 0.05, 24]} />
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
                    <coneGeometry args={[0.25, 0.5, 24]} />
                    <CeramicMaterial color={PALETTE.red} />
                </mesh>
                <mesh position={[0, -0.05, 0]}>
                    <torusGeometry args={[0.25, 0.08, 12, 24]} />
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
                    <capsuleGeometry args={[0.15, 0.4, 4, 12]} />
                    <CeramicMaterial color={PALETTE.candyWhite} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                     <torusGeometry args={[0.05, 0.02, 8, 12]} />
                     <CeramicMaterial color={PALETTE.red} />
                </mesh>
                <mesh position={[0, -0.25, 0]}>
                     <torusGeometry args={[0.05, 0.02, 8, 12]} />
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
  
  // Interactive Blush State
  const [isBlushing, setIsBlushing] = useState(false);
  const blushTimeoutRef = useRef<any>(null);

  // References for Cheek Animation
  const leftCheekRef = useRef<THREE.Mesh>(null);
  const rightCheekRef = useRef<THREE.Mesh>(null);
  const currentBlush = useRef(0); // Value from 0 to 1

  const handleHeadClick = (e: any) => {
      e.stopPropagation(); // Prevent orbiting when clicking the cat
      setIsBlushing(true);
      
      // Reset blushing after 2 seconds
      if (blushTimeoutRef.current) clearTimeout(blushTimeoutRef.current);
      blushTimeoutRef.current = setTimeout(() => {
          setIsBlushing(false);
      }, 2000);
  };

  useFrame((state, delta) => {
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

    // --- SMOOTH BLUSH ANIMATION ---
    const targetBlush = isBlushing ? 1 : 0;
    // Lerp current blush value towards target. Factor * delta controls speed.
    currentBlush.current = THREE.MathUtils.lerp(currentBlush.current, targetBlush, delta * 3.0);

    // Calculate interpolated values
    const blushScale = 1.0 + currentBlush.current * 0.2; // Scale 1.0 -> 1.2
    const blushOpacity = 0.2 + currentBlush.current * 0.6; // Opacity 0.2 -> 0.8
    
    // Color Interpolation: Pale Pink -> Meat/Rose Pink
    const baseColor = new THREE.Color("#ffb7b2"); 
    const flushColor = new THREE.Color("#ff80ab"); // A nice soft "meat pink" / rose
    const currentColor = baseColor.clone().lerp(flushColor, currentBlush.current);

    // Apply to Left Cheek
    if (leftCheekRef.current) {
        leftCheekRef.current.scale.setScalar(blushScale);
        const mat = leftCheekRef.current.material as THREE.MeshBasicMaterial;
        mat.color = currentColor;
        mat.opacity = blushOpacity;
    }
    // Apply to Right Cheek
    if (rightCheekRef.current) {
        rightCheekRef.current.scale.setScalar(blushScale);
        const mat = rightCheekRef.current.material as THREE.MeshBasicMaterial;
        mat.color = currentColor;
        mat.opacity = blushOpacity;
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
           {/* OPTIMIZATION: Reduced segments 16 -> 12/16 */}
           <sphereGeometry args={[0.45, 16, 12]} />
           <CeramicMaterial color={PALETTE.catOrange} />
        </mesh>
        <mesh position={[-0.4, 0.4, 0.2]}>
           <sphereGeometry args={[0.35, 16, 12]} />
           <CeramicMaterial color={PALETTE.catGrey} />
        </mesh>
      </group>

      {/* Head - Added Click Handler */}
      <group position={[0, 1.35, 0]} ref={headRef} onClick={handleHeadClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
          <mesh castShadow>
            {/* OPTIMIZATION: Reduced head segments 32 -> 24 */}
            <sphereGeometry args={[0.9, 24, 24]} />
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
                 <coneGeometry args={[0.28, 0.6, 16]} />
                 <CeramicMaterial color={PALETTE.catWhite} />
             </mesh>
             <mesh position={[-0.55, -0.05, 0.05]} rotation={[0, 0, 0.6]}>
                 <coneGeometry args={[0.18, 0.4, 16]} />
                 <meshStandardMaterial color={PALETTE.catEarPink} />
             </mesh>
             <mesh position={[0.55, 0, 0]} rotation={[0, 0, -0.6]}>
                 <coneGeometry args={[0.28, 0.6, 16]} />
                 <CeramicMaterial color={PALETTE.catGrey} />
             </mesh>
             <mesh position={[0.55, -0.05, 0.05]} rotation={[0, 0, -0.6]}>
                 <coneGeometry args={[0.18, 0.4, 16]} />
                 <meshStandardMaterial color={PALETTE.catEarPink} />
             </mesh>
          </group>

          {/* Face */}
          <group position={[0, 0.1, 0.82]}>
             <mesh position={[-0.28, 0.1, 0]}>
                 <sphereGeometry args={[0.09, 16, 16]} />
                 <CeramicMaterial color="#222" roughness={0.1} />
             </mesh>
             <mesh position={[0.28, 0.1, 0]}>
                 <sphereGeometry args={[0.09, 16, 16]} />
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
             
             {/* Cheeks - Interactive with Refs for Smooth Animation */}
             <mesh ref={leftCheekRef} position={[-0.45, -0.05, -0.05]}>
                 <circleGeometry args={[0.12, 16]} />
                 <meshBasicMaterial 
                    color="#ffb7b2"
                    transparent 
                    opacity={0.4} 
                 />
             </mesh>
             <mesh ref={rightCheekRef} position={[0.45, -0.05, -0.05]}>
                 <circleGeometry args={[0.12, 16]} />
                 <meshBasicMaterial 
                    color="#ffb7b2" 
                    transparent 
                    opacity={0.4} 
                 />
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
         {/* Main ceramic base - Reduced segments for mobile */}
        <mesh receiveShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[3.8, 4.0, 0.25, 48]} />
            <CeramicMaterial color={PALETTE.floorCeramic} roughness={0.1} metalness={0.2} />
        </mesh>
        
        {/* Scattered Decor - Fixed heights to prevent floating or clipping */}
        {/* Adjusted Y from 0.2 to 0.6 to sit properly on top of the floor */}
        <group position={[2.2, 0.6, 1]}>
             <MiniRedApple rotation={[0, 0, 0.2]} scale={0.7} />
        </group>

        <group position={[1.5, 0.6, 2.0]}>
             <MiniRedApple rotation={[0, 0, -0.2]} scale={0.65} />
        </group>
        
        {/* Candy on floor */}
        <group position={[-1.2, 0.25, 1.8]} rotation={[0, 0.5, 1.57]}>
            <mesh>
                 <capsuleGeometry args={[0.2, 0.5, 4, 12]} />
                 <CeramicMaterial color={PALETTE.candyWhite} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
                 <torusGeometry args={[0.06, 0.025, 8, 12]} />
                 <CeramicMaterial color={PALETTE.red} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
                 <torusGeometry args={[0.06, 0.025, 8, 12]} />
                 <CeramicMaterial color={PALETTE.red} />
            </mesh>
        </group>

        <group position={[-2.2, 0.3, 0.5]} rotation={[0, 1, 0]}>
             <mesh castShadow>
                 <boxGeometry args={[0.6, 0.6, 0.6]} />
                 <CeramicMaterial color={PALETTE.red} />
             </mesh>
             <mesh position={[0, 0.31, 0]} rotation={[0,0,0]}>
                 <cylinderGeometry args={[0.12, 0.12, 0.6, 12]} rotation={[0,0,Math.PI/2]} />
                 <CeramicMaterial color={PALETTE.star} />
             </mesh>
        </group>
    </group>
)

const SnowBase = () => {
    // A soft fading disc under the floor to blend it into the dark background
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]}>
        <circleGeometry args={[8, 32]} />
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
              float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
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

// Efficient Instanced Falling Snow
const DriftingSnow = ({ count = 60 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store initial positions and randomized properties
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 15, // Range X
        Math.random() * 12 + 2,     // Start Y
        (Math.random() - 0.5) * 15  // Range Z
      ),
      speed: 0.01 + Math.random() * 0.04,
      driftOffset: Math.random() * Math.PI * 2,
      scale: 0.2 + Math.random() * 0.4
    }));
  }, [count]);

  useFrame((state) => {
    if(!mesh.current) return;
    const time = state.clock.getElapsedTime();
    
    particles.forEach((p, i) => {
      // Fall down
      p.position.y -= p.speed;
      
      // Drift sideways
      const driftX = Math.sin(time * 0.5 + p.driftOffset) * 0.02;
      const driftZ = Math.cos(time * 0.3 + p.driftOffset) * 0.02;
      p.position.x += driftX;
      p.position.z += driftZ;

      // Reset if below floor (approx -2)
      if (p.position.y < -3) {
        p.position.y = 10;
        p.position.x = (Math.random() - 0.5) * 15;
        p.position.z = (Math.random() - 0.5) * 15;
      }

      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.scale);
      dummy.rotation.set(time + p.driftOffset, time * 0.5, 0); 
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      {/* Low poly circle (essentially a hexagon) for efficiency */}
      <circleGeometry args={[0.1, 6]} /> 
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
    </instancedMesh>
  )
}

const Snow = () => {
    return (
        <group>
            {/* Drifting Snowflakes (Physical falling motion) */}
            <DriftingSnow count={80} />
            
            {/* Ambient Sparkles (Background glisten) - Reduced count for mobile */}
            <Sparkles count={60} scale={[15, 10, 15]} size={3} speed={0.3} opacity={0.4} color="#ffffff" />
            <Sparkles count={20} scale={[12, 12, 12]} size={8} speed={0.6} opacity={0.6} color="#e0f7fa" noise={2} />
        </group>
    )
}

// --- Main Scene ---

export const CatTreeScene = () => {
  // Mobile check for better initial camera positioning
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Responsive camera config
  const cameraProps = isMobile 
    ? { position: [0, 0.5, 14], fov: 55 } // Mobile: Lower, further back, wider angle
    : { position: [0, 2, 11], fov: 45 };  // Desktop: Standard

  return (
    <Canvas shadows camera={cameraProps} dpr={[1, 2]}>
      {/* Deep Midnight Blue Background */}
      <color attach="background" args={['#0b1026']} />
      
      {/* Lighting for Dark Mode - Enhanced for lack of HDRI */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight 
        position={[3, 8, 5]} 
        intensity={1.8} 
        castShadow 
        // OPTIMIZATION: Reduced shadow map size for mobile (1024 is decent balance)
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Rim light for drama */}
      <spotLight position={[-5, 5, -5]} intensity={2.5} color="#b3e5fc" angle={0.6} penumbra={1} />
      {/* Warm fill */}
      <pointLight position={[0, 1, 3]} intensity={0.8} color="#ffd1dc" />
      
      {/* Synthetic Environment for reflections (No network request) */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 4, -0.3, 0]}>
            <mesh position={[0, 10, 5]} scale={5}>
                <sphereGeometry />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
             <mesh position={[10, 0, -5]} scale={5}>
                <sphereGeometry />
                <meshBasicMaterial color="#ffd1dc" />
            </mesh>
             <mesh position={[-10, 5, 0]} scale={5}>
                <sphereGeometry />
                <meshBasicMaterial color="#b3e5fc" />
            </mesh>
        </group>
      </Environment>

      {/* OPTIMIZATION: Reduced star count */}
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
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