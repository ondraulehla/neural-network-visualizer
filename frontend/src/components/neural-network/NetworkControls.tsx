"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { NeuronLayer, DatasetType } from '../../types/network';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NetworkControlsProps {
  layers: NeuronLayer[];
  weights: { [key: string]: number[] };
  pointCount: number;
  datasetType: DatasetType;
  learningRate: number;
  epochs: number;
  batchSize: number;
  l2Factor: number;
  onL2FactorChange: (value: number) => void;
  onBatchSizeChange: (value: number) => void;
  onLayerUpdate: (index: number, field: keyof NeuronLayer, value: string | number) => void;
  onLayerAdd: () => void;
  onLayerRemove: (index: number) => void;
  onWeightsUpdate: (layerKey: string, weights: number[]) => void;
  onPointCountChange: (value: number) => void;
  onWeightsValidChange?: (isValid: boolean) => void;
  onDatasetChange: (value: DatasetType) => void;
  onStartTraining?: () => Promise<void>;
  onLearningRateChange: (value: number) => void;
  onEpochsChange: (value: number) => void;
  isTraining?: boolean;
  trainingError?: number;
  epochCount?: number;
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  disabled?: boolean;
}

interface WeightInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder: string;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  disabled
}) => {
  return (
    <div className="flex flex-col items-center">
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          onClick={() => value > min && onChange(value - 1)}
          disabled={value <= min || disabled}
          variant="outline"
          className="h-10 w-10 text-lg font-bold"
        >
          -
        </Button>
        <div className="w-16 h-10 flex items-center justify-center border border-blue-200 rounded bg-white mx-auto">
          <span className="text-lg font-semibold">{value}</span>
        </div>
        <Button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max || disabled}
          variant="outline"
          className="h-10 w-10 text-lg font-bold"
        >
          +
        </Button>
      </div>
    </div>
  );
};

const WeightInput = React.forwardRef<HTMLInputElement, WeightInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [cursorPosition, setCursorPosition] = React.useState<number | null>(null);

    React.useEffect(() => {
      if (cursorPosition !== null && inputRef.current) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, [value, cursorPosition]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCursorPosition(e.target.selectionStart);
      onChange(e);
    };

    return (
      <Input
        {...props}
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
      />
    );
  });

WeightInput.displayName = 'WeightInput';

export const NetworkControls: React.FC<NetworkControlsProps> = ({
  layers,
  weights,
  pointCount,
  datasetType,
  learningRate,
  epochs,
  batchSize,
  l2Factor,
  isTraining,
  trainingError,
  epochCount,
  onL2FactorChange,
  onLayerUpdate,
  onLayerAdd,
  onLayerRemove,
  onWeightsUpdate,
  onPointCountChange,
  onWeightsValidChange,
  onDatasetChange,
  onStartTraining,
  onLearningRateChange,
  onEpochsChange,
  onBatchSizeChange,
}) => {
  const activationFunctions = ['relu', 'sigmoid', 'tanh', 'linear'];
  const currentEpoch = epochCount || 0;
  const currentError = trainingError || 0;

  const handleWeightChange = (layerKey: string, weightString: string, expectedCount: number): void => {
    try {
      const weightArray = weightString.split(',').map(w => {
        const parsed = parseFloat(w.trim());
        return Number(Number(isNaN(parsed) ? 0.1 : parsed).toFixed(2));
      });

      const isValid = weightArray.length === expectedCount;
      onWeightsValidChange?.(isValid);

      if (isValid) {
        onWeightsUpdate(layerKey, weightArray);
      }
    } catch (error) {
      console.error('Error parsing weights:', error);
      onWeightsValidChange?.(false);
      toast.error('Invalid weight format. Please enter decimal numbers separated by commas.');
    }
  };

  const formatWeights = (weightArray?: number[]): string => {
    if (!weightArray?.length) return '';
    return weightArray.map(w => w.toString()).join(', ');
  };

  const handleTraining = async () => {
    if (!onStartTraining) return;
    try {
      await onStartTraining();
      toast.success('Training completed successfully!');
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Training failed. Please check the console for details.');
    }
  };

  const handleLearningRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.0001 && value <= 1.0) {
      onLearningRateChange(value);
    }
  };

  const handleEpochsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 1000) {
      onEpochsChange(value);
    }
  };

  const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 1000) {
      onBatchSizeChange(value);
    }
  };

  return (
    <div className="space-y-4 mt-6">
      {/* Training Controls */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-medium mb-4">Training Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Learning Rate
            </label>
            <Input
              type="number"
              value={learningRate}
              onChange={handleLearningRateChange}
              min={0.0001}
              max={1}
              step={0.001}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Epochs
            </label>
            <Input
              type="number"
              value={epochs}
              onChange={handleEpochsChange}
              min={1}
              max={1000}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Batch Size
            </label>
            <Input
              type="number"
              value={batchSize}
              onChange={handleBatchSizeChange}
              min={1}
              max={1000}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              L2 Regularization
            </label>
            <Input
              type="number"
              value={l2Factor}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                  onL2FactorChange(value);
                }
              }}
              min={0}
              max={1}
              step={0.00001}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleTraining}
            disabled={isTraining}
            className="w-64"
          >
            {isTraining ? `Training... Epoch ${currentEpoch}` : 'Start Training'}
          </Button>
        </div>

        {isTraining && (
          <div className="space-y-2 mt-4">
            <Progress value={(currentEpoch / epochs) * 100} className="w-full" />
            <div className="text-sm text-gray-600 text-center">
              Error: {currentError.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {/* Layer Controls */}
      {layers.map((layer, index) => {
        const isOutputLayer = index === layers.length - 1;

        return (
          <div key={index} className={`p-4 border rounded ${isOutputLayer ? 'bg-gray-50 border-blue-200' : ''}`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1 flex flex-col items-center">
                {isOutputLayer ? (
                  <div className="text-center flex-1 flex flex-col items-center justify-center min-w-[200px]">
                    <div className="text-sm font-medium text-blue-600 mb-2">
                      Output Layer
                    </div>
                    <div className="w-16 h-10 flex items-center justify-center border border-blue-200 rounded bg-white">
                      <span className="text-lg font-semibold">3</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Fixed at 3 neurons for 3D visualization
                    </div>
                  </div>
                ) : index === 0 ? (
                  // Input layer - no controls, just display
                  <div className="text-center flex-1 flex flex-col items-center justify-center min-w-[200px]">
                    <div className="text-sm font-medium text-blue-600 mb-2">
                      Input Layer
                    </div>
                    <div className="w-16 h-10 flex items-center justify-center border border-blue-200 rounded bg-white">
                      <span className="text-lg font-semibold">2</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Fixed at 2 neurons for 2D input
                    </div>
                  </div>
                ) : (
                  <NumberInput
                    value={layer.num_neurons}
                    onChange={(value) => onLayerUpdate(index, 'num_neurons', value)}
                    min={1}
                    max={10}
                    label={`Layer ${index}`}
                  />
                )}
              </div>

              {index === 0 && (
                <div className="flex-1">
                  <div className="space-y-2">
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label className="block text-sm font-medium mb-1 cursor-help">
                              Input Dataset
                            </label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>random: Random points</p>
                            <p>circle: Points in a circle</p>
                            <p>xor: XOR pattern</p>
                            <p>spiral: Spiral pattern</p>
                            <p>gaussian: Gaussian clusters</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <select
                        value={datasetType}
                        onChange={(e) => onDatasetChange(e.target.value as DatasetType)}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="random">Random</option>
                        <option value="circle">Circle</option>
                        <option value="xor">XOR</option>
                        <option value="spiral">Spiral</option>
                        <option value="gaussian">Gaussian</option>
                      </select>
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label className="block text-sm font-medium mb-1 cursor-help">
                              Activation Function
                            </label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>relu: Linear for positive values, zero for negative</p>
                            <p>sigmoid: Smooth S-shaped curve between 0 and 1</p>
                            <p>tanh: Smooth S-shaped curve between -1 and 1</p>
                            <p>linear: Direct input-output mapping with no transformation</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <select
                        value={layer.activation_function || ''}
                        onChange={(e) => onLayerUpdate(index, 'activation_function', e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                      >
                        {activationFunctions.map(fn => (
                          <option key={fn} value={fn}>{fn}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label className="block text-sm font-medium mb-1 cursor-help">
                              Sample Size
                            </label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of random input samples to generate</p>
                            <p>Higher values give better visualization but take longer to compute</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input
                        type="number"
                        min={10}
                        max={1000}
                        step={10}
                        value={pointCount}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            onPointCountChange(Math.max(10, Math.min(1000, value)));
                          }
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {index > 0 && !isOutputLayer && (
                <Button
                  onClick={() => onLayerRemove(index)}
                  variant="destructive"
                >
                  Remove Layer
                </Button>
              )}
            </div>

            {index < layers.length - 1 && (
              <div className="mt-2 border-t pt-4">
                <div className="text-sm text-gray-600 mb-2">
                  Weights to {index === layers.length - 2 ? 'Output Layer' : `Layer ${index + 1}`}
                  <span className="ml-2 text-gray-400">
                    (Expected: {layer.num_neurons * layers[index + 1].num_neurons} weights)
                  </span>
                </div>
                <WeightInput
                  value={formatWeights(weights[`layer${index}_${index + 1}`])}
                  onChange={(e) => handleWeightChange(
                    `layer${index}_${index + 1}`,
                    e.target.value,
                    layer.num_neurons * layers[index + 1].num_neurons
                  )}
                  placeholder="Enter weights (e.g., -0.1, 0.5, -1.2)"
                  className="w-full font-mono text-sm"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Enter decimal numbers (positive or negative) separated by commas. Missing weights will be set to 0.
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-center">
        <Button
          onClick={onLayerAdd}
          className="mt-4"
          disabled={layers.length >= 5}
        >
          Add Layer
        </Button>
      </div>

      {/* Training Progress Display */}
      {isTraining && (
        <div className="mt-4 p-4 border rounded bg-white">
          <h4 className="font-medium mb-2">Training Progress</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Epoch: {currentEpoch}/{epochs}</span>
              <span>Error: {currentError.toFixed(6)}</span>
            </div>
            <Progress value={(currentEpoch / epochs) * 100} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkControls;