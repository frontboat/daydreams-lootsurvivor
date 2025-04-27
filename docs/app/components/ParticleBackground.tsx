"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
// @ts-ignore
import * as THREE from "three";

// Define mouse position type
interface MousePosition {
  x: number;
  y: number;
}

// Create a square texture for pixel-like points
function createSquareTexture() {
  if (typeof window === "undefined") return null; // Server-side check

  const size = 32;
  const padding = 2; // Border padding

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, size, size);

    // Draw square
    ctx.fillStyle = "white";
    ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ParticlesEffect({
  count = 2000,
  color = "#8b5cf6",
  speed = 0.005,
  size = 1.5,
  mouse,
}: {
  count?: number;
  color?: string;
  speed?: number;
  size?: number;
  mouse?: MousePosition;
}) {
  const points = useRef<THREE.Points>(null!);
  const { size: canvasSize, viewport } = useThree();

  // Define base opacity for consistency
  const baseOpacity = 0.4;

  // Keep track of the base color and brightened color for mouse interaction
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const brightColor = useMemo(() => {
    const c = new THREE.Color(color);
    // Make a much brighter version of the color
    c.r = Math.min(1, c.r * 2.0);
    c.g = Math.min(1, c.g * 2.0);
    c.b = Math.min(1, c.b * 2.0);
    return c;
  }, [color]);

  // Convert normalized mouse position to world coordinates
  const mouseToWorld = useMemo(() => {
    if (!mouse) return new THREE.Vector3(0, 0, 0);

    // Convert from normalized device coordinates (-1 to +1) to world coordinates
    const x = (mouse.x * viewport.width) / 2;
    const y = (mouse.y * viewport.height) / 2;

    return new THREE.Vector3(x, y, 0);
  }, [mouse, viewport]);

  // Generate random points with useMemo to prevent regeneration on each render
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() * 2 - 1) * 15;
      positions[i3 + 1] = (Math.random() * 2 - 1) * 15;
      positions[i3 + 2] = (Math.random() * 2 - 1) * 15;
    }
    return positions;
  }, [count]);

  // Create texture once
  const squareTexture = useMemo(() => createSquareTexture(), []);

  // Keep track of base size for particles
  const baseSize = useMemo(() => size, [size]);

  useFrame((state, delta) => {
    if (points.current) {
      // More subtle rotation
      points.current.rotation.x += delta * speed;
      points.current.rotation.y += delta * (speed * 1.5);

      // Update based on mouse position
      const pointsMaterial = points.current.material as THREE.PointsMaterial;

      // If mouse is active, increase brightness near the mouse
      if (mouse && mouse.x !== 0 && mouse.y !== 0) {
      } else {
        // Reset to base color and opacity
        pointsMaterial.color = baseColor;
        pointsMaterial.opacity = baseOpacity;
        pointsMaterial.size = baseSize;
      }
    }
  });

  return (
    <Points
      ref={points}
      positions={particlesPosition}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation={false}
        depthWrite={false}
        opacity={baseOpacity}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
        map={squareTexture || undefined}
      />
    </Points>
  );
}

export default function ParticleBackground() {
  // Track mouse position
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    // Function to update mouse position
    const handleMouseMove = (event: MouseEvent) => {
      // Calculate normalized device coordinates (-1 to +1)
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -((event.clientY / window.innerHeight) * 2 - 1); // Y is inverted in WebGL

      setMousePosition({ x, y });
    };

    // Add event listener with minimal throttling for better responsiveness
    window.addEventListener("mousemove", handleMouseMove);

    // Clean up
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none opacity-80">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true }}>
        <ParticlesEffect
          color="#a855f7"
          speed={0.002}
          size={2.5}
          mouse={mousePosition}
        />
        <ParticlesEffect
          count={600}
          color="#c084fc"
          speed={0.003}
          size={2}
          mouse={mousePosition}
        />
        <ParticlesEffect
          count={300}
          color="#d8b4fe"
          speed={0.004}
          size={3}
          mouse={mousePosition}
        />
      </Canvas>
    </div>
  );
}
