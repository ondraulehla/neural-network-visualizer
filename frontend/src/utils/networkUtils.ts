import { NeuronLayer, Weights } from '../types/network';
import { forward, ensureBounds } from '../components/neural-network/NeuralNetworkCompute';

// Visualization utilities
export const getActivationColor = (activation: string | null, darkMode: boolean = false): string => {
    if (darkMode) {
        switch (activation) {
            case 'relu': return '#34D399';    // Emerald-400
            case 'sigmoid': return '#C084FC';  // Purple-400
            case 'tanh': return '#FB923C';     // Orange-400
            case 'linear': return '#FBBF24';   // Amber-400
            default: return '#60A5FA';         // Blue-400
        }
    } else {
        switch (activation) {
            case 'relu': return '#4CAF50';    // Green
            case 'sigmoid': return '#9C27B0';  // Purple
            case 'tanh': return '#FF5722';     // Orange
            case 'linear': return '#FF9800';   // Amber
            default: return '#2196F3';         // Blue
        }
    }
};

export const getWeightColor = (weight: number, darkMode: boolean = false): string => {
    if (weight > 0) {
        const intensity = Math.min(Math.max(weight * 0.7, 0.3), 1);
        return darkMode ? 
            `rgba(96, 165, 250, ${intensity})` :  // Blue-400
            `rgba(0, 0, 255, ${intensity})`;
    }
    const intensity = Math.min(Math.max(Math.abs(weight) * 0.7, 0.3), 1);
    return darkMode ? 
        `rgba(248, 113, 113, ${intensity})` :  // Red-400
        `rgba(255, 0, 0, ${intensity})`;
};

export const getWeightWidth = (weight: number): number => {
    return Math.min(Math.max(Math.abs(weight) * 2 + 1.5, 1.5), 4);
};

export const getActivationSymbol = (type: string | null): string => {
    switch (type) {
        case 'relu': return 'R';
        case 'sigmoid': return 'σ';
        case 'tanh': return 'τ';
        case 'linear': return 'L';
        default: return '';
    }
};

// Network output normalization utilities
export const normalizeOutput = (output: number[]): number[] => 
    output.map(val => Math.max(-2, Math.min(2, val)));

export const normalizeOutputs = (outputs: number[][]): number[][] => 
    outputs.map(normalizeOutput);

export const processOutputs = (
  inputs: number[][],
  layers: NeuronLayer[],
  weights: Weights,
  biases: number[][]
): number[][] => {
  // Use full precision weights for computation
  const outputs = inputs.map(input => {
      const output = forward(input, layers, weights, biases);
      return output;
  });

  // Normalize to same range as targets
  const normalizeArray = (arr: number[][]) => {
      const dims = arr[0].length;
      const mins = Array(dims).fill(Infinity);
      const maxs = Array(dims).fill(-Infinity);
      
      arr.forEach(point => {
          point.forEach((val, i) => {
              mins[i] = Math.min(mins[i], val);
              maxs[i] = Math.max(maxs[i], val);
          });
      });
      
      return arr.map(point =>
          point.map((val, i) => {
              const range = maxs[i] - mins[i];
              if (range === 0) return 0;
              return (val - mins[i]) / range * 2 - 1; // Normalize to [-1, 1]
          })
      );
  };

  return normalizeArray(outputs);
};