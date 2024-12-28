import { NetworkConfiguration, NetworkResponse, DatasetType } from '../types/network';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://neural-network-backend-316730021938.us-central1.run.app";

export const networkService = {
  async getConfiguration(): Promise<NetworkConfiguration> {
    try {
      const response = await fetch(`${BACKEND_URL}/config`);
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const data: NetworkResponse = await response.json();
      
      if (data.network) {
        // Convert the NetworkResponse format to NetworkConfiguration
        return {
          layers: data.network.structure.layers.map(layer => ({
            num_neurons: layer.neurons,
            activation_function: layer.activation
          })),
          weights: data.network.connections.reduce((acc, conn) => {
            const layerKey = `layer${conn.from_layer}_${conn.to_layer}`;
            acc[layerKey] = conn.weights;
            return acc;
          }, {} as { [key: string]: number[] }),
          biases: data.network.structure.biases || [],
          sample_size: data.network.structure.sample_size || 100,
          dataset_type: data.network.structure.dataset_type || 'random',
          computed_coordinates: data.network.structure.computed_coordinates || [],
          input_points: data.network.structure.input_points || [],
          target_coordinates: data.network.structure.target_coordinates || [],
          training_params: data.network.structure.training_params || {
            learning_rate: 0.01,
            epochs: 100,
            batch_size: 32,
            l2_factor: 0.00005
          }
        };
      }
      
      return this.getDefaultConfiguration();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      throw error;
    }
  },

  async saveConfiguration(config: NetworkConfiguration): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  },

  getDefaultConfiguration(): NetworkConfiguration {
    return {
      layers: [
        { num_neurons: 2, activation_function: 'relu' },
        { num_neurons: 4, activation_function: null },
        { num_neurons: 3, activation_function: null }
      ],
      weights: {
        'layer0_1': [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
      },
      biases: [],
      sample_size: 100,
      dataset_type: 'random' as DatasetType,
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
  }
};