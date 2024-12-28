import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { NeuronLayer, Weights } from '../../types/network';

interface WeightsInputProps {
  layers: NeuronLayer[];
  weights: Weights;
  onWeightsUpdate: (layerKey: string, weights: number[]) => void;
  onValidStateChange?: (isValid: boolean) => void;
}

export const WeightsInput: React.FC<WeightsInputProps> = ({
  layers,
  weights,
  onWeightsUpdate,
  onValidStateChange
}) => {
  const [isValid, setIsValid] = useState(true);
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  const validateWeights = (layerKey: string, weightString: string, expectedCount: number) => {
    try {
      const weightArray = weightString.split(',').map(w => parseFloat(w.trim())).filter(w => !isNaN(w));
      return weightArray.length === expectedCount;
    } catch {
      return false;
    }
  };

  const handleWeightChange = (layerKey: string, value: string) => {
    // Just update the input value without parsing
    setInputValues(prev => ({ ...prev, [layerKey]: value }));
  };

  const handleWeightBlur = (layerKey: string, weightString: string, expectedCount: number) => {
    try {
      const weightArray = weightString.split(',')
        .map(w => {
          const parsed = parseFloat(w.trim());
          return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
        });

      const isValidWeights = weightArray.length === expectedCount;
      setIsValid(isValidWeights);
      onValidStateChange?.(isValidWeights);

      if (isValidWeights) {
        onWeightsUpdate(layerKey, weightArray);
      }
    } catch (error) {
      console.error('Error parsing weights:', error);
      setIsValid(false);
      onValidStateChange?.(false);
    }
  };

  if (layers.length <= 1) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">Layer Weights</h3>
      {Array.from({ length: layers.length - 1 }, (_, i) => {
        const layerKey = `layer${i}_${i + 1}`;
        const expectedWeights = layers[i].num_neurons * layers[i + 1].num_neurons;

        return (
          <div key={layerKey} className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Weights between Layer {i} ({layers[i].num_neurons} neurons) and Layer {i + 1} ({layers[i + 1].num_neurons} neurons)
              <br />
              <span className="text-sm text-gray-500">
                Expected: {expectedWeights} weights ({layers[i].num_neurons} × {layers[i + 1].num_neurons})
              </span>
            </label>
            <Input
              value={(inputValues[layerKey] ?? weights[layerKey]?.map(w => w.toFixed(2)).join(', ')) || ''}
              onChange={(e) => handleWeightChange(layerKey, e.target.value)}
              onBlur={(e) => handleWeightBlur(layerKey, e.target.value, expectedWeights)}
              placeholder="Enter weights separated by commas"
              className={`w-full ${!isValid ? 'border-red-500' : ''}`}
            />
          </div>
        );
      })}
      {!isValid && (
        <div className="text-red-500 text-sm mt-2">
          Please ensure all weight inputs have the correct number of values
        </div>
      )}
    </div>
  );
};