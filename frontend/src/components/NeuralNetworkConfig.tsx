"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NetworkVisualization } from './neural-network/NetworkVisualization';
import { NetworkControls } from './neural-network/NetworkControls';
import { useNetworkConfiguration } from '../hooks/useNetworkConfiguration';
import { NeuronLayer } from '../types/network';
import NetworkVisualization3D from './neural-network/NetworkVisualization3D';
import NetworkVisualization2D from './neural-network/NetworkVisualization2D';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const NeuralNetworkConfig: React.FC = () => {
  const [weightsValid, setWeightsValid] = useState(true);
  const [showTargets, setShowTargets] = useState(false);
  const {
    layers,
    weights,
    sampleSize,
    coordinates,
    targetCoordinates,
    inputPoints,
    loading,
    error,
    datasetType,
    isTraining,
    trainingError,
    epochCount,
    learningRate,
    epochs,
    batchSize,
    l2Factor,
    setL2Factor,
    setBatchSize,
    setLayers,
    setWeights,
    setSampleSize,
    setDatasetType,
    setLearningRate,
    setEpochs,
    updateWeightsOnLayerChange,
    saveConfiguration,
    recomputeWithNewBiases,
    startTraining,
  } = useNetworkConfiguration();

  const handleWeightUpdate = (layerKey: string, weightIndex: number, newValue: number) => {
    try {
      // Get the layer numbers from the key
      const [fromLayer, toLayer] = layerKey.split('_').map(x => parseInt(x.replace('layer', '')));
      const expectedWeights = layers[fromLayer].num_neurons * layers[toLayer].num_neurons;

      // Create or get existing weights array
      let layerWeights = weights[layerKey] ? [...weights[layerKey]] : new Array(expectedWeights).fill(0);

      // Ensure array is of correct length
      if (layerWeights.length !== expectedWeights) {
        layerWeights = new Array(expectedWeights).fill(0);
      }

      // Update the specific weight
      if (weightIndex >= 0 && weightIndex < expectedWeights) {
        layerWeights[weightIndex] = newValue;

        const newWeights = {
          ...weights,
          [layerKey]: layerWeights
        };

        // Only update state without saving configuration
        setWeights(newWeights);
      } else {
        throw new Error(`Weight index ${weightIndex} out of bounds (0-${expectedWeights - 1})`);
      }
    } catch (error: unknown) {
      console.error('Error updating weight:', error);
      toast.error(`Failed to update weight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    try {
      const newLayers = [...layers];
      if (newLayers.length > 0) {
        newLayers[newLayers.length - 1] = {
          ...newLayers[newLayers.length - 1],
          num_neurons: 3,
          activation_function: null
        };
        setLayers(newLayers);
      }

      toast.promise(saveConfiguration(), {
        loading: 'Saving configuration...',
        success: 'Configuration saved successfully',
        error: (err) => `Error saving configuration: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  const handleLayerUpdate = (index: number, field: keyof NeuronLayer, value: string | number) => {
    const newLayers = [...layers];

    if (field === 'activation_function' && index !== 0) {
      return;
    }

    if (index === layers.length - 1 && field === 'num_neurons') {
      value = 3;
    }

    newLayers[index] = {
      ...newLayers[index],
      [field]: field === 'activation_function' ? value : Number(value)
    };
    setLayers(newLayers);

    if (field === 'num_neurons') {
      updateWeightsOnLayerChange(newLayers);
    }
  };

  const handleLayerAdd = () => {
    if (layers.length >= 5) {
      toast.error('Maximum number of layers (5) reached');
      return;
    }
    const newLayers = [
      ...layers.slice(0, -1),
      { num_neurons: 4, activation_function: null },
      { num_neurons: 3, activation_function: null }
    ];
    setLayers(newLayers);
    updateWeightsOnLayerChange(newLayers);
  };

  // In NeuralNetworkConfig.tsx
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Neural Network Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkVisualization layers={layers} weights={weights} onWeightUpdate={handleWeightUpdate} />
          <NetworkControls
            layers={layers}
            weights={weights}
            pointCount={sampleSize}
            datasetType={datasetType}
            learningRate={learningRate}
            epochs={epochs}
            batchSize={batchSize}
            l2Factor={l2Factor}
            onL2FactorChange={setL2Factor}
            onLayerUpdate={handleLayerUpdate}
            onLayerAdd={handleLayerAdd}
            onLayerRemove={(index) => {
              if (index === layers.length - 1) {
                toast.error('Cannot remove output layer');
                return;
              }
              const newLayers = layers.filter((_, i) => i !== index);
              setLayers(newLayers);
              updateWeightsOnLayerChange(newLayers);
            }}
            onWeightsUpdate={(layerKey, newWeights) => {
              setWeights({ ...weights, [layerKey]: newWeights });
            }}
            onPointCountChange={setSampleSize}
            onWeightsValidChange={setWeightsValid}
            onDatasetChange={(value) => {
              setDatasetType(value);
              recomputeWithNewBiases();
            }}
            onStartTraining={startTraining}
            onLearningRateChange={setLearningRate}
            onEpochsChange={setEpochs}
            onBatchSizeChange={setBatchSize}
            isTraining={isTraining}
            trainingError={trainingError}
            epochCount={epochCount}
          />

          <div className="flex justify-center mt-6">
            <Button
              onClick={handleSave}
              disabled={loading || !weightsValid || isTraining}
              variant="outline"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </>
              ) : 'Save Configuration'}
            </Button>
          </div>

          {coordinates && coordinates.length > 0 && (
            <div className="mt-6 border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Network Visualization</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-targets"
                      checked={showTargets}
                      onCheckedChange={setShowTargets}
                    />
                    <Label htmlFor="show-targets">Show Target Points</Label>
                  </div>
                  <Button
                    onClick={() => {
                      toast.promise(
                        recomputeWithNewBiases(),
                        {
                          loading: 'Generating new visualization...',
                          success: 'New visualization created',
                          error: 'Failed to generate visualization'
                        }
                      );
                    }}
                    variant="outline"
                  >
                    Explore Different Biases
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">
                    Input Pattern ({inputPoints.length} points)
                  </div>
                  <NetworkVisualization2D inputPoints={inputPoints} />
                  <div className="text-sm text-gray-500 mt-2 text-center">
                    Use mouse wheel to zoom, drag to pan
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">
                    Network Output ({coordinates.length} points)
                  </div>
                  <NetworkVisualization3D
                    coordinates={coordinates}
                    targetCoordinates={showTargets ? targetCoordinates : undefined}
                  />
                  <div className="text-sm text-gray-500 mt-2 text-center">
                    Use mouse to rotate, scroll to zoom, and right-click to pan
                  </div>
                </div>
              </div>

              {isTraining && (
                <div className="mt-4 p-4 border rounded bg-gray-50">
                  <div className="text-sm font-medium">Training Progress</div>
                  <div className="text-sm text-gray-600">
                    Error: {trainingError.toFixed(6)} | Epoch: {epochCount}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NeuralNetworkConfig;