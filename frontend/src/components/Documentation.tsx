import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Documentation: React.FC = () => {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Neural Network Visualization</CardTitle>
          <CardDescription>
            Learn how this web application helps you understand and interact with neural networks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700 mb-4">
              This web application allows you to visualize and interact with a neural network that transforms 2D input points into 3D output shapes. You can modify the network architecture, adjust training parameters, and see the results in real-time.
            </p>
          </section>

          {/* Network Structure Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Network Structure</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Input Layer</h3>
              <p className="text-gray-700 ml-4">
                - Fixed at 2 neurons for 2D input points<br />
                - Configurable activation function (ReLU, Sigmoid, Tanh, Linear)
              </p>

              <h3 className="text-lg font-medium">Hidden Layers</h3>
              <p className="text-gray-700 ml-4">
                - Add up to 3 hidden layers<br />
                - Customize number of neurons (1-16) per layer<br />
                - Adjustable weights between layers
              </p>

              <h3 className="text-lg font-medium">Output Layer</h3>
              <p className="text-gray-700 ml-4">
                - Fixed at 3 neurons for 3D output visualization<br />
                - Automatically processes input to create 3D shapes
              </p>
            </div>
          </section>

          {/* Interactive Features Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Interactive Features</h2>
            <div className="space-y-2">
              <div>
                <h3 className="text-lg font-medium">Weight Editing</h3>
                <p className="text-gray-700 ml-4">
                  Click on any connection line to modify its weight. Use positive values for enhancement and negative values for inhibition.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Layer Management</h3>
                <p className="text-gray-700 ml-4">
                  Add or remove layers, adjust neuron counts, and see immediate visual feedback of your changes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">3D Visualization</h3>
                <p className="text-gray-700 ml-4">
                  - Rotate, zoom, and pan to explore the output shape<br />
                  - Toggle between network output and target shape<br />
                  - Compare how well your network matches the desired output
                </p>
              </div>
            </div>
          </section>

          {/* Training Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Training Settings</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium">Learning Rate</h3>
                <p className="text-gray-700 ml-4">
                  Controls how much the network adjusts its weights in response to errors. Higher values mean faster learning but might be less stable.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Epochs</h3>
                <p className="text-gray-700 ml-4">
                  Number of complete passes through the training dataset. More epochs allow for better learning but take longer.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Batch Size</h3>
                <p className="text-gray-700 ml-4">
                  Number of samples processed before updating the network. Larger batches are more stable but take more memory.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">L2 Regularization</h3>
                <p className="text-gray-700 ml-4">
                  Prevents overfitting by penalizing large weights. Higher values create simpler models but might underfit.
                </p>
              </div>
            </div>
          </section>

          {/* Input Datasets Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Input Datasets</h2>
            <div className="space-y-2">
              <p className="text-gray-700">Choose from different input patterns:</p>
              <ul className="list-disc ml-6 text-gray-700">
                <li><strong>Random:</strong> Randomly distributed points</li>
                <li><strong>Circle:</strong> Points arranged in a circular pattern</li>
                <li><strong>XOR:</strong> Classical XOR pattern demonstrating non-linear separation</li>
                <li><strong>Spiral:</strong> Interleaved spiral pattern</li>
                <li><strong>Gaussian:</strong> Points clustered in Gaussian distributions</li>
              </ul>
            </div>
          </section>

          {/* Tips Section */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Tips for Best Results</h2>
            <ul className="list-disc ml-6 text-gray-700">
              <li>Start with a simple network and gradually add complexity</li>
              <li>Use smaller learning rates for more stable training</li>
              <li>Experiment with different activation functions for different patterns</li>
              <li>Monitor the error rate during training to avoid overfitting</li>
              <li>Try different input datasets to understand the network&apos;s capabilities</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documentation;