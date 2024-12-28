// types/network.ts

export type DatasetType = 'random' | 'circle' | 'xor' | 'spiral' | 'gaussian';

export interface NeuronLayer {
    num_neurons: number;
    activation_function: string | null;
}
  
export interface Weights {
    [key: string]: number[];
}

interface TrainingParameters {
    learning_rate: number;
    epochs: number;
    batch_size: number;
    l2_factor: number;
}
  
export interface NetworkConfiguration {
    layers: NeuronLayer[];
    weights: Weights;
    biases: number[][];
    sample_size: number;
    dataset_type: DatasetType;
    computed_coordinates: number[][];
    input_points: number[][];
    target_coordinates: number[][];
    training_params: TrainingParameters;
}
  
// Update NetworkStructure interface
export interface NetworkStructure {
    total_layers: number;
    layers: {
        index: number;
        neurons: number;
        is_input: boolean;
        is_output: boolean;
        activation: string | null;
    }[];
    sample_size?: number;
    dataset_type?: DatasetType;
    biases?: number[][];
    computed_coordinates?: number[][];
    input_points?: number[][];
    target_coordinates?: number[][];
    training_params: {  // Make this non-optional and match backend model
        learning_rate: number;
        epochs: number;
        batch_size: number;
        l2_factor: number;
    };
}

export interface ApiResponse {
    status: string;
    message?: string;
    configuration?: NetworkConfiguration;
}

export interface NetworkResponse {
    status: string;
    network: {
        structure: NetworkStructure;
        connections: {
            from_layer: number;
            to_layer: number;
            weights: number[];
        }[];
    };
}