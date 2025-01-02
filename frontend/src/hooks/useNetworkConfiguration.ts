import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { NetworkConfiguration, NeuronLayer, Weights, NetworkResponse, DatasetType } from '../types/network';
import { BACKEND_URL } from '../config/constants';
import {
    generateRandomWeights,
    generateBiases,
    generateDataset,
    trainNetwork,
    forward,
    ensureBounds
} from '../components/neural-network/NeuralNetworkCompute';
import { processOutputs } from '../utils/networkUtils';


const defaultConfiguration: NetworkConfiguration = {
    layers: [
        { num_neurons: 2, activation_function: 'tanh' },    // Input layer
        { num_neurons: 4, activation_function: 'tanh' },    // Hidden layer
        { num_neurons: 3, activation_function: 'tanh' }     // Output layer
    ],
    weights: {},
    sample_size: 100,
    dataset_type: 'random',
    biases: [],
    computed_coordinates: [],
    input_points: [],
    target_coordinates: [],
    training_params: {
        learning_rate: 0.01,
        epochs: 100,
        batch_size: 32,
        l2_factor: 0.00005
    }
};

export function useNetworkConfiguration() {
    const [layers, setLayers] = useState<NeuronLayer[]>(defaultConfiguration.layers);
    const [weights, setWeights] = useState<Weights>(defaultConfiguration.weights);
    const [biases, setBiases] = useState<number[][]>([]);
    const [loading, setLoading] = useState(true);
    const [sampleSize, setSampleSize] = useState<number>(100);
    const [error, setError] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState<number[][]>([]);
    const [targetCoordinates, setTargetCoordinates] = useState<number[][]>([]);
    const [inputPoints, setInputPoints] = useState<number[][]>([]);
    const [datasetType, setDatasetType] = useState<DatasetType>('random');
    const [isTraining, setIsTraining] = useState(false);
    const [trainingError, setTrainingError] = useState<number>(0);
    const [epochCount, setEpochCount] = useState<number>(0);
    const [learningRate, setLearningRate] = useState<number>(0.01);
    const [epochs, setEpochs] = useState<number>(100);
    const [batchSize, setBatchSize] = useState<number>(defaultConfiguration.training_params.batch_size);
    const [l2Factor, setL2Factor] = useState<number>(0.00005);


    const loadConfiguration = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/config`);
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }
            const data = (await response.json()) as NetworkResponse;

            if (data.network) {
                // Load layers
                const networkLayers = data.network.structure.layers.map(layer => ({
                    num_neurons: layer.neurons,
                    activation_function: layer.activation
                }));
                setLayers(networkLayers);

                // Load weights
                const networkWeights: Weights = {};
                data.network.connections.forEach(conn => {
                    const layerKey = `layer${conn.from_layer}_${conn.to_layer}`;
                    networkWeights[layerKey] = conn.weights;
                });
                setWeights(networkWeights);

                // Load basic configuration and coordinates
                const savedCoordinates = data.network.structure.computed_coordinates || [];
                const savedInputPoints = data.network.structure.input_points || [];
                const savedTargetCoordinates = data.network.structure.target_coordinates || [];

                setSampleSize(data.network.structure.sample_size ?? defaultConfiguration.sample_size);
                setDatasetType(data.network.structure.dataset_type ?? defaultConfiguration.dataset_type);

                // Load training parameters with defaults
                const trainingParams = data.network.structure.training_params ?? defaultConfiguration.training_params;
                setLearningRate(trainingParams.learning_rate ?? defaultConfiguration.training_params.learning_rate);
                setEpochs(trainingParams.epochs ?? defaultConfiguration.training_params.epochs);
                setBatchSize(trainingParams.batch_size ?? defaultConfiguration.training_params.batch_size);
                setL2Factor(trainingParams.l2_factor ?? defaultConfiguration.training_params.l2_factor);

                if (data.network.structure.biases) {
                    setBiases(data.network.structure.biases);

                    // Check for actual data in the arrays, not just length
                    if (Array.isArray(savedCoordinates) && savedCoordinates.length > 0 &&
                        Array.isArray(savedInputPoints) && savedInputPoints.length > 0 &&
                        Array.isArray(savedTargetCoordinates) && savedTargetCoordinates.length > 0) {

                        setInputPoints(savedInputPoints);
                        setCoordinates(savedCoordinates);
                        setTargetCoordinates(savedTargetCoordinates);
                    } else {
                        const { inputs, targets } = createTrainingData(
                            data.network.structure.sample_size ?? defaultConfiguration.sample_size,
                            data.network.structure.dataset_type ?? defaultConfiguration.dataset_type
                        );
                        setInputPoints(inputs);
                        setTargetCoordinates(targets);

                        const outputs = processOutputs(
                            inputs,
                            networkLayers,
                            networkWeights,
                            data.network.structure.biases
                        );
                        setCoordinates(outputs);
                    }
                } else {
                    console.log('No biases found, initializing default configuration');
                    await initializeDefaultConfiguration();
                }
            } else {
                console.log('No network data found, initializing default configuration');
                await initializeDefaultConfiguration();
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            await initializeDefaultConfiguration();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                await loadConfiguration();
            } catch (error) {
                console.error('Error in initialization:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize');
            }
        };
        init();
    }, []);

    const computeMSE = (predicted: number[][], actual: number[][]): number => {
        let totalError = 0;
        const n = predicted.length;

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < predicted[i].length; j++) {
                totalError += Math.pow(predicted[i][j] - actual[i][j], 2);
            }
        }

        return totalError / (n * predicted[0].length);
    };

    const createTrainingData = (size: number, type: DatasetType) => {
        const inputs = generateDataset(size, type, 0.1);

        // Normalize inputs to [-1, 1] consistently
        const normalizedInputs = inputs.map(point =>
            point.map(val => Math.max(-1, Math.min(1, val)))
        );

        // Generate target shapes with consistent scaling
        const targets = normalizedInputs.map(([x, y]) => {
            // Input x, y are already in [-1, 1]
            switch (type) {
                case 'circle': {
                    const r = Math.sqrt(x * x + y * y);
                    // Normalize r to [0, 1]
                    const normalizedR = Math.min(1, r);
                    return [
                        x, // Keep original x
                        y, // Keep original y
                        Math.cos(normalizedR * Math.PI) // Z in [-1, 1]
                    ];
                }
                case 'spiral': {
                    const r = Math.sqrt(x * x + y * y);
                    const theta = Math.atan2(y, x);
                    // r is naturally in [0, 1], theta in [-π, π]
                    return [
                        x,
                        y,
                        Math.sin(theta * 3 + r * 4) // Z naturally in [-1, 1]
                    ];
                }
                case 'gaussian': {
                    const peaks = [
                        { x: -0.5, y: -0.5, h: 1.0 },
                        { x: 0.5, y: 0.5, h: -1.0 },
                        { x: -0.5, y: 0.5, h: 0.5 },
                        { x: 0.5, y: -0.5, h: -0.5 }
                    ];

                    const z = peaks.reduce((sum, peak) => {
                        const dist = Math.sqrt(
                            Math.pow(x - peak.x, 2) +
                            Math.pow(y - peak.y, 2)
                        );
                        return sum + peak.h * Math.exp(-dist * 3);
                    }, 0);

                    // z is already normalized by peak heights
                    return [x, y, Math.tanh(z)]; // Ensure z is in [-1, 1]
                }
                case 'xor': {
                    const xSign = x > 0 ? 1 : -1;
                    const ySign = y > 0 ? 1 : -1;
                    const xorVal = xSign * ySign < 0 ? 1 : -1;
                    return [x, y, xorVal]; // Clean binary output
                }
                default: {
                    const freq = 3;
                    // Create a smooth surface that naturally bounds to [-1, 1]
                    return [
                        x,
                        y,
                        Math.tanh(Math.sin(x * freq) * Math.cos(y * freq))
                    ];
                }
            }
        });

        return {
            inputs: normalizedInputs,
            targets: targets.map(target => target.map(val => ensureBounds(val)))
        };
    };

    const startTraining = async () => {
        if (isTraining) return;

        setIsTraining(true);
        try {
            // Generate and normalize input data
            const { inputs, targets } = createTrainingData(sampleSize, datasetType);
            setInputPoints(inputs);
            setTargetCoordinates(targets);

            // Create training data pairs
            const trainingData = inputs.map((input, i) => ({
                input,
                target: targets[i]
            }));

            // Create deep copies for training
            const workingWeights = JSON.parse(JSON.stringify(weights));
            const workingBiases = JSON.parse(JSON.stringify(biases));

            // Train the network
            const result = await trainNetwork(
                layers,
                workingWeights,
                workingBiases,
                trainingData,
                {
                    learningRate,
                    epochs,
                    batchSize,
                    l2Factor,
                    onProgress: (epoch, error, currentWeights, currentBiases) => {
                        setEpochCount(epoch);
                        setTrainingError(error);

                        // Update visualization every 5 epochs
                        if (epoch % 5 === 0) {
                            const currentOutputs = processOutputs(
                                inputs,
                                layers,
                                currentWeights,
                                currentBiases
                            );

                            // Check for NaN or Infinity values
                            const hasInvalid = currentOutputs.some(output =>
                                output.some(val => isNaN(val) || !isFinite(val))
                            );

                            if (hasInvalid) {
                                console.warn("Warning: Invalid values detected in outputs");
                            }

                            setCoordinates(currentOutputs);
                        }

                        // Early stopping check
                        if (error < 1e-6) {
                            console.log("Early stopping triggered - reached target error");
                            return false; // Signal to stop training
                        }

                        return true; // Continue training
                    }
                }
            );

            // Set final results
            setWeights(formatWeights(result.weights));
            setBiases(result.biases);

            const finalOutputs = processOutputs(
                inputs,
                layers,
                result.weights,
                result.biases
            );

            // Validate final outputs
            const finalError = computeMSE(finalOutputs, targets);

            setCoordinates(finalOutputs);
            toast.success(`Training completed! Final error: ${finalError.toFixed(6)}`);

        } catch (error) {
            console.error('Training error:', error);
            toast.error('Training failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsTraining(false);
        }
    };

    const initializeDefaultConfiguration = async () => {
        const newLayers = defaultConfiguration.layers;
        const newWeights = generateInitialWeights(newLayers);
        const newBiases = generateBiases(newLayers);

        setLayers(newLayers);
        setWeights(newWeights);
        setBiases(newBiases);
        setSampleSize(defaultConfiguration.sample_size);
        setDatasetType(defaultConfiguration.dataset_type);

        setLearningRate(defaultConfiguration.training_params.learning_rate);
        setEpochs(defaultConfiguration.training_params.epochs);
        setBatchSize(defaultConfiguration.training_params.batch_size);
        setL2Factor(defaultConfiguration.training_params.l2_factor);

        const { inputs, targets } = createTrainingData(
            defaultConfiguration.sample_size,
            defaultConfiguration.dataset_type
        );

        setInputPoints(inputs);
        setTargetCoordinates(targets);

        const outputs = processOutputs(inputs, newLayers, newWeights, newBiases);
        setCoordinates(outputs);
    };

    const generateInitialWeights = (layers: NeuronLayer[]): Weights => {
        const weights: Weights = {};
        for (let i = 0; i < layers.length - 1; i++) {
            const layerKey = `layer${i}_${i + 1}`;
            // Use full precision weights
            const rawWeights = generateRandomWeights(
                layers[i].num_neurons,
                layers[i + 1].num_neurons
            );
            // Format only when setting in UI
            weights[layerKey] = rawWeights.map(w => Number(Number(w).toFixed(2)));
        }
        return weights;
    };

    const updateWeightsOnLayerChange = async (newLayers: NeuronLayer[]) => {
        let newWeights = { ...weights };

        Object.keys(newWeights).forEach(key => {
            const [fromLayer, toLayer] = key.split('_').map(x => parseInt(x.replace('layer', '')));
            if (fromLayer >= newLayers.length - 1 || toLayer >= newLayers.length) {
                delete newWeights[key];
            }
        });

        for (let i = 0; i < newLayers.length - 1; i++) {
            const layerKey = `layer${i}_${i + 1}`;
            const currentLayer = newLayers[i];
            const nextLayer = newLayers[i + 1];
            const expectedWeights = currentLayer.num_neurons * nextLayer.num_neurons;

            if (!newWeights[layerKey] || newWeights[layerKey].length !== expectedWeights) {
                // Generate full precision weights
                newWeights[layerKey] = generateRandomWeights(
                    currentLayer.num_neurons,
                    nextLayer.num_neurons
                );
            }
        }

        // Use our formatWeights helper to format all weights consistently
        newWeights = formatWeights(newWeights);
        setWeights(newWeights);

        const newBiases = generateBiases(newLayers);
        setBiases(newBiases);

        const { inputs, targets } = createTrainingData(sampleSize, datasetType);
        setInputPoints(inputs);
        setTargetCoordinates(targets);

        const outputs = processOutputs(inputs, newLayers, newWeights, newBiases);
        setCoordinates(outputs);
    };

    const formatWeights = (weights: Weights): Weights => {
        const formattedWeights: Weights = {};
        Object.keys(weights).forEach(key => {
            formattedWeights[key] = weights[key].map(w =>
                Number(Number(w).toFixed(2))
            );
        });
        return formattedWeights;
    };

    const recomputeWithNewBiases = async () => {
        const newBiases = generateBiases(layers);
        setBiases(newBiases);

        const { inputs, targets } = createTrainingData(sampleSize, datasetType);
        setInputPoints(inputs);
        setTargetCoordinates(targets);

        const outputs = processOutputs(inputs, layers, weights, newBiases);
        setCoordinates(outputs);
    };

    const saveConfiguration = async () => {
        try {
            setLoading(true);

            // Create a deep copy of the coordinates to ensure they're properly serialized
            const configToSave = {
                layers,
                weights,
                biases,
                sample_size: sampleSize,
                dataset_type: datasetType,
                computed_coordinates: JSON.parse(JSON.stringify(coordinates)),
                input_points: JSON.parse(JSON.stringify(inputPoints)),
                target_coordinates: JSON.parse(JSON.stringify(targetCoordinates)),
                training_params: {
                    learning_rate: learningRate,
                    epochs: epochs,
                    batch_size: batchSize,
                    l2_factor: l2Factor
                }
            };

            const response = await fetch(`${BACKEND_URL}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configToSave),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save configuration');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error saving configuration:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        layers,
        weights,
        biases,
        sampleSize,
        coordinates,
        targetCoordinates,
        inputPoints,
        datasetType,
        loading,
        error,
        isTraining,
        trainingError,
        epochCount,
        learningRate,
        epochs,
        batchSize,
        l2Factor,
        setL2Factor,
        setLearningRate,
        setEpochs,
        setBatchSize,
        setLayers,
        setWeights,
        setBiases,
        setSampleSize,
        setDatasetType,
        updateWeightsOnLayerChange,
        saveConfiguration,
        reloadConfiguration: loadConfiguration,
        recomputeWithNewBiases,
        startTraining
    };
}