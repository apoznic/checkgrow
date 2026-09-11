import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, Stars, OrbitControls } from '@react-three/drei';
import { useRef, useState, Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

function InteractiveOrb({ position, color, scale = 1, speed = 1 }: { 
  position: [number, number, number]; 
  color: string; 
  scale?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2 * speed;
      
      // Subtle pulse when hovered
      if (hovered) {
        meshRef.current.scale.setScalar(scale * (1 + Math.sin(state.clock.elapsedTime * 4) * 0.05));
      }
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1.5}>
      <mesh 
        ref={meshRef} 
        position={position} 
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 48, 48]} />
        <MeshDistortMaterial
          color={color}
          distort={hovered ? 0.5 : 0.3}
          speed={1.5}
          roughness={0.2}
          metalness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 500;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#a855f7" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function ConnectionLines() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const nodes: [number, number, number][] = [
    [0, 0, 0],
    [-2.5, 1.5, -1],
    [2.5, -0.8, -0.5],
    [-1.5, -1.5, 0.5],
    [2, 1.8, 0.5],
    [-2, 0, 1.5],
    [0, 2, -1],
  ];

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <mesh key={i} position={node}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  const { mouse } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouse.x * 0.15,
        0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouse.y * 0.08,
        0.05
      );
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#a855f7" />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#06b6d4" />
      
      {/* Central main orb */}
      <InteractiveOrb position={[0, 0, 0]} color="#a855f7" scale={1.5} speed={0.4} />
      
      {/* Satellite orbs */}
      <InteractiveOrb position={[-3, 1.2, -1.5]} color="#06b6d4" scale={0.5} speed={0.8} />
      <InteractiveOrb position={[2.8, -0.8, -1]} color="#e879f9" scale={0.4} speed={1} />
      <InteractiveOrb position={[-2, -1.5, 0.5]} color="#8b5cf6" scale={0.35} speed={1.2} />
      <InteractiveOrb position={[2.2, 1.8, 0.5]} color="#22d3ee" scale={0.45} speed={0.9} />
      
      {/* Network connections */}
      <ConnectionLines />
      
      {/* Particle field */}
      <ParticleField />
      
      {/* Subtle stars */}
      <Stars radius={30} depth={40} count={1500} factor={3} saturation={0} fade speed={0.5} />
      
      <Environment preset="night" />
    </group>
  );
}

export function Hero3D() {
  return (
    <section className="relative z-10 min-h-[85vh] flex items-center overflow-visible">
      {/* Interactive 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 7], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Scene />
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 2.5}
              autoRotate
              autoRotateSpeed={0.3}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Gradient overlays for seamless blending */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-[1] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full px-6 py-12 md:py-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AI-Powered Team Formation
            </span>
          </motion.div>

          {/* Main Heading - Simpler, bolder */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <span className="text-foreground">Build Dreams.</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Find Your Tribe.
            </span>
          </motion.h1>

          {/* Subtitle - Cleaner */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Describe your vision. AI assembles your perfect team from global talent pools in seconds.
          </motion.p>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {[
              { value: '5,000+', label: 'Professionals' },
              { value: '98%', label: 'Match Rate' },
              { value: '24h', label: 'Avg. Formation' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons - Cleaner */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Link to="/auth?mode=signup&type=supply">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 transition-colors hover:bg-primary/90"
              >
                <Users className="w-4 h-4" />
                Join as Talent
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <Link to="/auth?mode=signup&type=demand">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-6 py-3 bg-secondary/50 text-foreground border border-border rounded-xl font-medium flex items-center justify-center gap-2 transition-colors hover:bg-secondary"
              >
                <Rocket className="w-4 h-4" />
                Build Your Team
              </motion.button>
            </Link>
          </motion.div>

          {/* Interactive hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-8 text-xs text-muted-foreground/60"
          >
            ↑ Drag to explore the network ↑
          </motion.p>
        </div>
      </div>
    </section>
  );
}
