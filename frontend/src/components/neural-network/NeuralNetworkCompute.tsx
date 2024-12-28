import { DatasetType, NeuronLayer, Weights } from '@/types/network';

// Activation functions
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const relu = (x: number): number => Math.max(0, x);
export const tanh = (x: number): number => Math.tanh(x);
export const linear = (x: number): number => x;

// Activation function derivatives
const sigmoidDerivative = (x: number): number => {
  const s = sigmoid(x);
  return s * (1 - s);
};

const reluDerivative = (x: number): number => x > 0 ? 1 : 0;
const tanhDerivative = (x: number): number => 1 - Math.pow(tanh(x), 2);
const linearDerivative = (_: number): number => 1;

const getActivationFunction = (type: string | null): {
  output: (x: number) => number;
  derivative: (x: number) => number;
} => {
  switch (type) {
    case 'relu':
      return { output: relu, derivative: reluDerivative };
    case 'tanh':
      return { output: tanh, derivative: tanhDerivative };
    case 'linear':
      return { output: linear, derivative: linearDerivative };
    case 'sigmoid':
    default:
      return { output: sigmoid, derivative: sigmoidDerivative };
  }
};

// Dataset generation
export const generateRandomInput = (size: number, datasetType: DatasetType, noise: number = 0.1): number[] => {
  const randUniform = (a: number, b: number) => Math.random() * (b - a) + a;

  const normalRandom = (mean = 0, variance = 1): number => {
    let v1: number, v2: number, s: number;
    do {
      v1 = 2 * Math.random() - 1;
      v2 = 2 * Math.random() - 1;
      s = v1 * v1 + v2 * v2;
    } while (s > 1);

    let result = Math.sqrt(-2 * Math.log(s) / s) * v1;
    return mean + Math.sqrt(variance) * result;
  };

  switch (datasetType) {
    case 'circle': {
      const radius = 1;
      // Generate more points near the edge
      const t = Math.pow(Math.random(), 0.7); // Bias towards edge
      const r = radius * t;
      const angle = Math.random() * 2 * Math.PI;
      const radialNoise = (Math.random() * 2 - 1) * noise * 0.03;
      return [
        r * Math.cos(angle) + radialNoise * Math.cos(angle),
        r * Math.sin(angle) + radialNoise * Math.sin(angle)
      ];
    }

    case 'gaussian': {
      const variance = 0.2 + (noise * 0.3);
      const centers = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
      const cluster = Math.floor(Math.random() * 4);
      const [cx, cy] = centers[cluster];
      return [
        normalRandom(cx, variance),
        normalRandom(cy, variance)
      ];
    }

    case 'spiral': {
      const n = 100;
      const i = Math.floor(Math.random() * n);
      const r = (i / n);
      const direction = Math.random() < 0.5 ? 0 : Math.PI;
      const t = 1.75 * i / n * 2 * Math.PI + direction;
      return [
        r * Math.sin(t) + randUniform(-0.1, 0.1) * noise,
        r * Math.cos(t) + randUniform(-0.1, 0.1) * noise
      ];
    }

    case 'xor': {
      const padding = 0.1;
      let x = randUniform(-1, 1);
      x += x > 0 ? padding : -padding;
      let y = randUniform(-1, 1);
      y += y > 0 ? padding : -padding;
      const noiseX = randUniform(-0.2, 0.2) * noise;
      const noiseY = randUniform(-0.2, 0.2) * noise;
      return [x + noiseX, y + noiseY];
    }

    default: {
      const radius = 1;
      return [
        randUniform(-radius, radius),
        randUniform(-radius, radius)
      ];
    }
  }
};

// Helper function to create dataset with proper noise
export const generateDataset = (
  sampleSize: number,
  datasetType: DatasetType,
  noise: number = 0.1
): number[][] => {
  return Array(sampleSize).fill(0).map(() =>
    generateRandomInput(2, datasetType, noise)
  );
};

export const generateRandomWeights = (inputSize: number, outputSize: number): number[] => {
  const scaleFactor = Math.sqrt(10.0 / (inputSize + outputSize));
  return Array(inputSize * outputSize).fill(0).map(() =>
    (Math.random() * 2 - 1) * scaleFactor
  );
};

export const generateBiases = (layers: NeuronLayer[]): number[][] => {
  return layers.map(layer =>
    Array(layer.num_neurons)
      .fill(0)
      .map(() => Number((Math.random() * 0.2 - 0.1).toFixed(2)))
  );
};

const distance = (p1: number[], p2: number[]): number => {
  return Math.sqrt(p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0));
};

const computeGeometricLoss = (predicted: number[], target: number[], neighborsPred: number[][], neighborsTarget: number[][]): number => {
  let geometricLoss = 0;

  // Direct coordinate differences with dimension-specific weights
  const dimWeights = [1.0, 1.0, 1.5];  // More weight on height
  geometricLoss += predicted.reduce((sum, val, dim) =>
    sum + dimWeights[dim] * Math.pow(val - target[dim], 2), 0);

  // Simple neighbor distance preservation
  for (let i = 0; i < neighborsPred.length; i++) {
    const distPred = distance(predicted, neighborsPred[i]);
    const distTarget = distance(target, neighborsTarget[i]);
    geometricLoss += Math.pow(distPred - distTarget, 2);
  }

  return geometricLoss;
};

const normalizePoint = (point: number[], mins: number[], maxs: number[]): number[] => {
  return point.map((val, i) => {
    const range = maxs[i] - mins[i];
    if (range === 0) return 0;
    // Different scaling for z-dimension
    const scale = i === 2 ? 0.5 : 1.0;
    return (val - mins[i]) / range * scale;
  });
};

const findBounds = (points: number[][]): { mins: number[], maxs: number[] } => {
  const dims = points[0].length;
  const mins = Array(dims).fill(Infinity);
  const maxs = Array(dims).fill(-Infinity);

  points.forEach(point => {
    point.forEach((val, i) => {
      mins[i] = Math.min(mins[i], val);
      maxs[i] = Math.max(maxs[i], val);
    });
  });

  return { mins, maxs };
};

// Forward propagation
export const forward = (
  input: number[],
  layers: NeuronLayer[],
  weights: Weights,
  biases: number[][]
): number[] => {
  // Input is already in [-1, 1]
  let current = [...input];

  for (let i = 0; i < layers.length - 1; i++) {
    const layerKey = `layer${i}_${i + 1}`;
    const currentLayerSize = layers[i].num_neurons;
    const nextLayerSize = layers[i + 1].num_neurons;
    const activation = getActivationFunction(layers[i].activation_function);

    const layerWeights = weights[layerKey];
    const next = Array(nextLayerSize).fill(0);

    for (let j = 0; j < nextLayerSize; j++) {
      next[j] = biases[i + 1][j];
      for (let k = 0; k < currentLayerSize; k++) {
        const weightIndex = k * nextLayerSize + j;
        next[j] += current[k] * layerWeights[weightIndex];
      }
      // Apply activation and ensure bounds
      next[j] = activation.output(next[j]);
      // Ensure final output is in [-1, 1]
      if (i === layers.length - 2) {
        next[j] = ensureBounds(next[j]);
      }
    }
    current = next;
  }

  return current;
};

export const ensureBounds = (val: number, min: number = -1, max: number = 1): number => {
  return Math.max(min, Math.min(max, val));
};

// Backpropagation
export const backpropagate = (
  input: number[],
  target: number[],
  neighbors: { input: number[], target: number[] }[],
  layers: NeuronLayer[],
  weights: Weights,
  biases: number[][]
): { weightGradients: Weights; biasGradients: number[][] } => {
  const activations: number[][] = [];
  const zs: number[][] = [];
  let current = [...input];
  activations.push(current);

  // Forward pass storing intermediate values
  for (let i = 0; i < layers.length - 1; i++) {
    const layerKey = `layer${i}_${i + 1}`;
    const currentLayerSize = layers[i].num_neurons;
    const nextLayerSize = layers[i + 1].num_neurons;
    const activation = getActivationFunction(layers[i].activation_function);  // Changed here

    const layerWeights = weights[layerKey];
    const z = Array(nextLayerSize).fill(0);

    for (let j = 0; j < nextLayerSize; j++) {
      z[j] = biases[i + 1][j];
      for (let k = 0; k < currentLayerSize; k++) {
        const weightIndex = k * nextLayerSize + j;
        z[j] += current[k] * layerWeights[weightIndex];
      }
    }

    zs.push(z);
    current = z.map(activation.output);
    activations.push(current);
  }

  // Backward pass
  const weightGradients: Weights = {};
  const biasGradients: number[][] = layers.map(layer =>
    Array(layer.num_neurons).fill(0)
  );

  let delta = activations[activations.length - 1].map((output, i) => {
    let mseGrad = output - target[i];

    // Add geometric gradient with scalar values
    let geoGrad = 0;
    neighbors.forEach(neighbor => {
      const neighborOutput = forward(neighbor.input, layers, weights, biases);
      const outputDiff = output - neighborOutput[i];
      const targetDiff = target[i] - neighbor.target[i];
      const distDiff = Math.abs(outputDiff) - Math.abs(targetDiff);
      geoGrad += 2 * distDiff * Math.sign(outputDiff);
    });

    return mseGrad + 0.1 * geoGrad;  // Same weight as in loss function
  });

  // Backpropagate error
  for (let l = layers.length - 2; l >= 0; l--) {
    const layerKey = `layer${l}_${l + 1}`;
    const activation = getActivationFunction(layers[l].activation_function);  // Changed here

    weightGradients[layerKey] = [];
    for (let i = 0; i < layers[l].num_neurons; i++) {
      for (let j = 0; j < layers[l + 1].num_neurons; j++) {
        weightGradients[layerKey].push(
          activations[l][i] * delta[j]
        );
      }
    }

    biasGradients[l + 1] = [...delta];

    if (l > 0) {
      const newDelta = Array(layers[l].num_neurons).fill(0);
      for (let i = 0; i < layers[l].num_neurons; i++) {
        for (let j = 0; j < layers[l + 1].num_neurons; j++) {
          const weightIndex = i * layers[l + 1].num_neurons + j;
          newDelta[i] += weights[layerKey][weightIndex] * delta[j];
        }
        newDelta[i] *= activation.derivative(zs[l - 1][i]);
      }
      delta = newDelta;
    }
  }

  return { weightGradients, biasGradients };
};

export const computeOutputs = async (
  layers: NeuronLayer[],
  weights: Weights,
  biases: number[][],
  sampleSize: number,
  datasetType: DatasetType
): Promise<number[][]> => {
  const inputs = Array(sampleSize).fill(0).map(() =>
    generateRandomInput(2, datasetType)
  );

  return inputs.map(input => {
    const output = forward(input, layers, weights, biases);
    while (output.length < 3) output.push(0);
    return output.slice(0, 3);
  });
};

// Helper function for finding nearest neighbors
const findKNearestNeighbors = (point: number[], points: number[][], k: number): number[][] => {
  return points
    .map((p, i) => ({ point: p, dist: distance(point, p) }))
    .filter(p => p.dist > 0)  // Exclude the point itself
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map(p => p.point);
};

const denormalizePoint = (point: number[], mins: number[], maxs: number[]): number[] => {
  return point.map((val, i) => {
    const range = maxs[i] - mins[i];
    return range === 0 ? mins[i] : (val + 1) / 2 * range + mins[i];
  });
};

interface TrainingResult {
  weights: Weights;
  displayWeights: Weights; // Add this line
  biases: number[][];
  error: number;
  normalization?: {
    inputMins: number[];
    inputMaxs: number[];
    targetMins: number[];
    targetMaxs: number[];
  };
}

export const trainNetwork = async (
  layers: NeuronLayer[],
  weights: Weights,
  biases: number[][],
  trainingData: { input: number[], target: number[] }[],
  options: {
    learningRate?: number;
    epochs?: number;
    batchSize?: number;
    l2Factor?: number;
    onProgress?: (epoch: number, error: number, currentWeights: Weights, currentBiases: number[][]) => void;
  } = {}
): Promise<TrainingResult> => {
  const {
    learningRate = 0.01,
    epochs = 200,
    batchSize = 32,
    l2Factor = 0.00005,
    onProgress
  } = options;

  // Deep copy initial weights to avoid modifying input
  let currentWeights = JSON.parse(JSON.stringify(weights));
  let currentBiases = JSON.parse(JSON.stringify(biases));
  let totalError = 0;

  // Format weights for display only
  const formatWeightsForDisplay = (weights: Weights): Weights => {
    return Object.entries(weights).reduce((acc, [key, vals]) => ({
      ...acc,
      [key]: vals.map(w => Number(Number(w).toFixed(2)))
    }), {} as Weights);
  };

  // Initialize momentum velocities
  const baseMomentum = 0.9;
  const weightVelocities: Weights = {};
  Object.keys(weights).forEach(key => {
    weightVelocities[key] = Array(weights[key].length).fill(0);
  });
  const biasVelocities = biases.map(layer => Array(layer.length).fill(0));

  // Normalize all inputs and targets
  const allInputs = trainingData.map(d => d.input);
  const allTargets = trainingData.map(d => d.target);

  const { mins: inputMins, maxs: inputMaxs } = findBounds(allInputs);
  const { mins: targetMins, maxs: targetMaxs } = findBounds(allTargets);

  const normalizedData = trainingData.map(({ input, target }) => ({
    input: normalizePoint(input, inputMins, inputMaxs),
    target: normalizePoint(target, targetMins, targetMaxs)
  }));

  const clipGradients = (gradients: Weights, maxNorm: number) => {
    Object.keys(gradients).forEach(key => {
      const norm = Math.sqrt(gradients[key].reduce((sum, g) => sum + g * g, 0));
      if (norm > maxNorm) {
        const scale = maxNorm / norm;
        gradients[key] = gradients[key].map(g => g * scale);
      }
    });
    return gradients;
  };

  for (let epoch = 0; epoch < epochs; epoch++) {
    totalError = 0;
    const shuffledData = [...normalizedData].sort(() => Math.random() - 0.5);

    // Calculate learning rate decay
    const momentum = baseMomentum + (1 - baseMomentum) * (epoch / epochs);
    const initialLR = learningRate;
    const decayedLR = initialLR * Math.pow(0.998, epoch);

    for (let i = 0; i < shuffledData.length; i += batchSize) {
      const batch = shuffledData.slice(i, Math.min(i + batchSize, shuffledData.length));
      const batchGradients = {
        weights: {} as Weights,
        biases: biases.map(layer => Array(layer.length).fill(0))
      };

      // Accumulate gradients for batch
      for (const example of batch) {
        const output = forward(example.input, layers, currentWeights, currentBiases);

        const k = Math.min(5, batch.length - 1);
        const neighbors = findKNearestNeighbors(example.input, batch.map(d => d.input), k);
        const neighborOutputs = neighbors.map(n => forward(n, layers, currentWeights, currentBiases));
        const neighborTargets = neighbors.map(n => {
          const idx = batch.findIndex(d => d.input === n);
          return batch[idx].target;
        });

        const mseLoss = output.reduce((sum, o, i) =>
          sum + 0.5 * Math.pow(o - example.target[i], 2), 0
        );

        const geometricLoss = computeGeometricLoss(
          output,
          example.target,
          neighborOutputs,
          neighborTargets
        );

        totalError += mseLoss + 0.1 * geometricLoss;

        // Add L2 regularization
        (Object.values(currentWeights) as number[][]).forEach((layerWeights) => {
          totalError += l2Factor * layerWeights.reduce((sum: number, w: number) =>
            sum + 0.5 * w * w, 0
          );
        });

        const { weightGradients, biasGradients } = backpropagate(
          example.input,
          example.target,
          neighborTargets.map((target, i) => ({
            input: neighbors[i],
            target: target
          })),
          layers,
          currentWeights,
          currentBiases
        );

        // Accumulate gradients
        Object.keys(weightGradients).forEach(key => {
          if (!batchGradients.weights[key]) {
            batchGradients.weights[key] = weightGradients[key];
          } else {
            batchGradients.weights[key] = batchGradients.weights[key]
              .map((g, i) => g + weightGradients[key][i]);
          }
        });

        batchGradients.biases = batchGradients.biases
          .map((layer, i) => layer
            .map((g, j) => g + biasGradients[i][j]));
      }

      batchGradients.weights = clipGradients(batchGradients.weights, 0.5);

      const scaledLR = decayedLR / batch.length;

      // Update weights with momentum and L2 regularization
      Object.keys(batchGradients.weights).forEach(key => {
        weightVelocities[key] = weightVelocities[key].map((v: number, i: number) => {
          const l2Gradient = l2Factor * currentWeights[key][i];
          return momentum * v - scaledLR * (batchGradients.weights[key][i] + l2Gradient);
        });
        currentWeights[key] = currentWeights[key].map((w: number, i: number) =>
          w + weightVelocities[key][i]
        );
      });

      // Update biases with momentum
      currentBiases = currentBiases.map((layer: number[], i: number) =>
        layer.map((b: number, j: number) => {
          biasVelocities[i][j] = momentum * biasVelocities[i][j] -
            scaledLR * batchGradients.biases[i][j];
          return b + biasVelocities[i][j];
        })
      );
    }

    const avgError = totalError / normalizedData.length;
    if (onProgress) {
      // Format weights only for display in UI
      const displayWeights = formatWeightsForDisplay(currentWeights);
      onProgress(epoch, avgError, displayWeights, currentBiases);
    }

    // Early stopping if error is very small
    if (avgError < 1e-4) {
      break;
    }
  }

  return {
    // Return both full precision and display weights
    weights: currentWeights,
    displayWeights: formatWeightsForDisplay(currentWeights),
    biases: currentBiases,
    error: totalError / normalizedData.length,
    normalization: {
      inputMins,
      inputMaxs,
      targetMins,
      targetMaxs
    }
  };
};