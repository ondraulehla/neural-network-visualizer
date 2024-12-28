import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface NetworkVisualization3DProps {
  coordinates: number[][];
  targetCoordinates?: number[][];
  className?: string;
}

const NetworkVisualization3D: React.FC<NetworkVisualization3DProps> = ({
  coordinates,
  targetCoordinates,
  className = "w-full h-[400px] rounded-lg overflow-hidden border border-gray-200"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !coordinates || coordinates.length === 0) return;

    // Store ref value
    const currentContainer = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Calculate bounds for all points
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const updateBounds = (points: number[][]) => {
      points.forEach(([x, y, z]) => {
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);
        }
      });
    };

    updateBounds(coordinates);
    if (targetCoordinates) {
      updateBounds(targetCoordinates);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Calculate the bounding sphere radius
    const radius = Math.max(
      maxX - minX,
      maxY - minY,
      maxZ - minZ
    ) / 2;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      currentContainer.clientWidth / currentContainer.clientHeight,
      0.01,
      1000
    );

    // Position camera based on bounding sphere
    const distance = radius * 3;
    camera.position.set(
      centerX + distance,
      centerY + distance,
      centerZ + distance
    );
    camera.lookAt(centerX, centerY, centerZ);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentContainer.innerHTML = '';
    currentContainer.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(centerX, centerY, centerZ);

    // Grid helper
    const gridSize = radius * 4;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions);
    gridHelper.position.set(centerX, centerY, centerZ);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(radius * 2);
    axesHelper.position.set(centerX, centerY, centerZ);
    scene.add(axesHelper);

    // Create point materials with different sizes and colors
    const createPointCloud = (points: number[][], color: number, size: number) => {
      const validPoints = points.filter(p =>
        p.length === 3 && p.every(v => !isNaN(v) && isFinite(v))
      );

      if (validPoints.length === 0) return null;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(validPoints.flat());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        size: radius * size,
        color: color,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        depthWrite: false
      });

      return new THREE.Points(geometry, material);
    };

    // Add network output points
    const outputPoints = createPointCloud(coordinates, 0x4CAF50, 0.04);
    if (outputPoints) scene.add(outputPoints);

    // Add target points if available
    if (targetCoordinates) {
      const targetPoints = createPointCloud(targetCoordinates, 0xff3366, 0.03);
      if (targetPoints) scene.add(targetPoints);
    }

    // Animation
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    const handleResize = () => {
      if (!currentContainer) return;
      camera.aspect = currentContainer.clientWidth / currentContainer.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentContainer?.contains(renderer.domElement)) {
        currentContainer.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [coordinates, targetCoordinates]);

  return <div ref={containerRef} className={className} />;
};

export default NetworkVisualization3D;