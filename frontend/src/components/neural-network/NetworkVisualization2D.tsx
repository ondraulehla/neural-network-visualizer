import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface NetworkVisualization2DProps {
    inputPoints: number[][];
    className?: string;
}

const NetworkVisualization2D: React.FC<NetworkVisualization2DProps> = ({
    inputPoints,
    className = "w-full h-[400px] rounded-lg overflow-hidden border border-gray-200"
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !inputPoints || inputPoints.length === 0) return;

        // Store ref value
        const currentContainer = containerRef.current;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        // Calculate bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        inputPoints.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radius = Math.max(maxX - minX, maxY - minY) / 2;

        // Camera setup - Orthographic for 2D visualization
        const aspect = currentContainer.clientWidth / currentContainer.clientHeight;
        const zoom = 2;
        const camera = new THREE.OrthographicCamera(
            -aspect * zoom,
            aspect * zoom,
            zoom,
            -zoom,
            0.1,
            1000
        );
        camera.position.z = 5;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight);
        currentContainer.innerHTML = '';
        currentContainer.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false;
        controls.enableDamping = true;
        controls.screenSpacePanning = true;

        // Grid helper
        const gridHelper = new THREE.GridHelper(4, 20);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);

        // Axes helper
        const axesHelper = new THREE.AxesHelper(2);
        scene.add(axesHelper);

        // Points
        const circleGeometry = new THREE.CircleGeometry(0.01, 16); // Reduced radius from 0.05 to 0.02, fewer segments
        const material = new THREE.MeshBasicMaterial({
            color: 0x00cc88,
            transparent: true,
            opacity: 0.6,  // Reduced opacity to see overlapping points better
        });

        inputPoints.forEach(([x, y]) => {
            const circle = new THREE.Mesh(circleGeometry, material);
            circle.position.set(x, y, 0);
            scene.add(circle);
        });

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
            const aspect = currentContainer.clientWidth / currentContainer.clientHeight;
            const zoom = 2;

            if (camera instanceof THREE.OrthographicCamera) {
                camera.left = -aspect * zoom;
                camera.right = aspect * zoom;
                camera.top = zoom;
                camera.bottom = -zoom;
                camera.updateProjectionMatrix();
            }

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
    }, [inputPoints]);

    return <div ref={containerRef} className={className} />;
};

export default NetworkVisualization2D;