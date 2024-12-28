import React, { useState, useRef, useEffect } from 'react';
import { NeuronLayer, Weights } from '../../types/network';
import { getActivationColor, getActivationSymbol, getWeightColor, getWeightWidth } from '../../utils/networkUtils';
import { Input } from '@/components/ui/input';

interface NetworkVisualizationProps {
  layers: NeuronLayer[];
  weights: Weights;
  darkMode?: boolean;
  onWeightUpdate?: (layerKey: string, weightIndex: number, newValue: number) => void;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  layers,
  weights,
  darkMode = false,
  onWeightUpdate
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<{
    layerKey: string;
    weightIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setDimensions({
          width: Math.min(800, Math.max(300, containerWidth)),
          height: Math.min(600, Math.max(300, containerWidth * 0.75))
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  const handleWeightSubmit = () => {
    if (!editingWeight) return;

    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue)) {
      onWeightUpdate?.(
        editingWeight.layerKey,
        editingWeight.weightIndex,
        newValue
      );
    }
    setEditingWeight(null);
  };

  // Close weight editor when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingWeight && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        handleWeightSubmit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingWeight, inputValue, handleWeightSubmit]);

  // Dynamic dimensions
  const svgWidth = dimensions.width;
  const svgHeight = dimensions.height;
  const nodeRadius = Math.max(12, Math.min(20, svgWidth / 40));
  const maxLayers = 5;
  const horizontalPadding = svgWidth * 0.125;

  // Responsive spacing calculations
  const layerSpacing = (svgWidth - 2 * horizontalPadding) / (maxLayers - 1);
  const totalWidth = (layers.length - 1) * layerSpacing;
  const startX = (svgWidth - totalWidth) / 2;

  const maxNeuronsInLayer = Math.max(...layers.map(layer => layer.num_neurons));
  const verticalSpacing = Math.min((svgHeight - svgHeight * 0.2) / maxNeuronsInLayer, svgHeight * 0.1);

  const getNeuronY = (layerIndex: number, neuronIndex: number, totalNeuronsInLayer: number): number => {
    const layerHeight = (totalNeuronsInLayer - 1) * verticalSpacing;
    const startY = (svgHeight - layerHeight) / 2;
    return startY + (neuronIndex * verticalSpacing);
  };

  const getNeuronX = (layerIndex: number): number => {
    return startX + layerIndex * layerSpacing;
  };

  // Dark mode styles
  const textColor = darkMode ? '#E5E7EB' : '#666';
  const tooltipBg = darkMode ? '#374151' : 'white';
  const tooltipBorder = darkMode ? '#4B5563' : '#666';
  const tooltipText = darkMode ? '#E5E7EB' : '#333';
  const defaultNeuronColor = darkMode ? '#3B82F6' : '#2196F3';

  const handleWeightClick = (
    layerKey: string,
    weightIndex: number,
    x: number,
    y: number,
    currentWeight: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setEditingWeight({ layerKey, weightIndex, x, y });
    setInputValue(currentWeight.toFixed(2));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="w-full overflow-x-auto mt-6">
      <div className="relative" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          className="mx-auto"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Draw connections */}
          {layers.map((layer, layerIndex) => {
            if (layerIndex < layers.length - 1) {
              const currentLayer = layer;
              const nextLayer = layers[layerIndex + 1];
              const layerKey = `layer${layerIndex}_${layerIndex + 1}`;
              const connections: React.ReactNode[] = [];

              for (let i = 0; i < currentLayer.num_neurons; i++) {
                const startX = getNeuronX(layerIndex);
                const startY = getNeuronY(layerIndex, i, currentLayer.num_neurons);

                for (let j = 0; j < nextLayer.num_neurons; j++) {
                  const endX = getNeuronX(layerIndex + 1);
                  const endY = getNeuronY(layerIndex + 1, j, nextLayer.num_neurons);

                  const midX = (startX + endX) / 2;
                  const midY = (startY + endY) / 2;

                  // Calculate curve based on target neuron position
                  const curveOffset = (() => {
                    // Maximum and minimum curve strengths
                    const maxCurve = layerSpacing * 0.5;
                    const minCurve = layerSpacing * 0.2;  // Minimum curve to ensure no straight lines

                    // Calculate relative positions in their layers
                    const targetPosition = j / (nextLayer.num_neurons - 1);

                    // Determine if going to upper or lower half
                    const isUpperHalf = targetPosition < 0.5;

                    // Calculate curve magnitude
                    let magnitude;
                    if (isUpperHalf) {
                      // For upper half: maximum at top, decreasing towards middle
                      magnitude = minCurve + (maxCurve - minCurve) * (1 - targetPosition * 2);
                      return -magnitude;  // Negative for upward curve
                    } else {
                      // For lower half: maximum at bottom, decreasing towards middle
                      magnitude = minCurve + (maxCurve - minCurve) * ((targetPosition - 0.5) * 2);
                      return magnitude;  // Positive for downward curve
                    }
                  })();

                  // Calculate control points
                  const controlX = midX;
                  const controlY = midY + curveOffset;

                  // Calculate weight index
                  const weightIndex = i * nextLayer.num_neurons + j;
                  const weight = weights[layerKey]?.[weightIndex] || 0;
                  const connectionKey = `${layerIndex}-${i}-${j}`;

                  // Create path command
                  const pathCommand = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

                  connections.push(
                    <g key={connectionKey}>
                      <path
                        d={pathCommand}
                        stroke="transparent"
                        strokeWidth={20}
                        fill="none"
                        onMouseEnter={() => setHoveredConnection(connectionKey)}
                        onMouseLeave={() => setHoveredConnection(null)}
                        onClick={(e) => handleWeightClick(
                          layerKey,
                          weightIndex,
                          controlX,
                          controlY,
                          weight,
                          e
                        )}
                        style={{ cursor: 'pointer' }}
                      />
                      <path
                        d={pathCommand}
                        stroke={getWeightColor(weight, darkMode)}
                        strokeWidth={getWeightWidth(weight)}
                        fill="none"
                        className="transition-all duration-300 pointer-events-none"
                      />
                      {hoveredConnection === connectionKey && !editingWeight && (
                        <g>
                          <rect
                            x={controlX - 25}
                            y={controlY - 12}
                            width={50}
                            height={24}
                            rx={4}
                            fill={tooltipBg}
                            stroke={tooltipBorder}
                          />
                          <text
                            x={controlX}
                            y={controlY}
                            textAnchor="middle"
                            dy=".3em"
                            fontSize={12}
                            fill={tooltipText}
                          >
                            {weight.toFixed(2)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }
              }
              return connections;
            }
            return null;
          })}

          {/* Draw neurons */}
          {layers.map((layer, layerIndex) => {
            const x = getNeuronX(layerIndex);
            return (
              <g key={layerIndex} className="transition-all duration-300">
                {Array.from({ length: layer.num_neurons }).map((_, i) => {
                  const y = getNeuronY(layerIndex, i, layer.num_neurons);
                  return (
                    <g key={`${layerIndex}-${i}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius}
                        fill={layerIndex === 0 ?
                          getActivationColor(layer.activation_function, darkMode) :
                          defaultNeuronColor}
                        className="transition-all duration-300"
                      />
                      {layerIndex === 0 && (
                        <text
                          x={x}
                          y={y - nodeRadius - 5}
                          textAnchor="middle"
                          fill={textColor}
                          fontSize={Math.max(10, nodeRadius * 0.7)}
                          fontWeight="bold"
                        >
                          {getActivationSymbol(layer.activation_function)}
                        </text>
                      )}
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dy=".3em"
                        fill="white"
                        fontSize={Math.max(10, nodeRadius * 0.7)}
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={x}
                  y={svgHeight - 20}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={Math.max(10, nodeRadius * 0.7)}
                >
                  {layerIndex === 0 ? 'Input Layer' :
                    layerIndex === layers.length - 1 ? 'Output Layer' :
                      `Layer ${layerIndex}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Weight editor overlay */}
        {editingWeight && (
          <div
            className="absolute z-50 bg-white border rounded shadow-lg p-1"
            style={{
              left: `${editingWeight.x - 25}px`,
              top: `${editingWeight.y - 12}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleWeightSubmit();
                }
                if (e.key === 'Escape') setEditingWeight(null);
              }}
              onBlur={handleWeightSubmit}
              className="w-20 h-8 text-sm p-1"
              step={0.1}
            />
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: getActivationColor('relu', darkMode) }}></div>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>ReLU (R)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: getActivationColor('sigmoid', darkMode) }}></div>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Sigmoid (σ)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: getActivationColor('tanh', darkMode) }}></div>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Tanh (τ)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: getActivationColor('linear', darkMode) }}></div>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Linear (L)</span>
          </div>
          <div className="flex items-center">
            <div className={`w-16 h-4 mr-2 ${darkMode ?
              'bg-gradient-to-r from-red-600 via-gray-600 to-blue-500' :
              'bg-gradient-to-r from-red-500 via-white to-blue-500'}`}></div>
            <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
              Weights: Red (negative) to Blue (positive)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkVisualization;