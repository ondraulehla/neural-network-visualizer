import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import NeuralNetworkConfig from './NeuralNetworkConfig';
import Documentation from './Documentation';

const NetworkLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<'network' | 'docs'>('network');

  return (
    <div>
      {/* Navigation */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-2 flex justify-end space-x-2">
          <Button
            variant={currentView === 'network' ? 'default' : 'outline'}
            onClick={() => setCurrentView('network')}
          >
            Network Configuration
          </Button>
          <Button
            variant={currentView === 'docs' ? 'default' : 'outline'}
            onClick={() => setCurrentView('docs')}
          >
            How to Use
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {currentView === 'network' ? (
          <div className="p-8">
            <NeuralNetworkConfig />
          </div>
        ) : (
          <Documentation />
        )}
      </div>
    </div>
  );
};

export default NetworkLayout;