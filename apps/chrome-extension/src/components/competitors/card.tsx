import type React from 'react';

import { Card } from '@acme/ui/card';

export const CompetitorsCard: React.FC = () => {
  return (
    <Card>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Competitors</h3>
        </div>
        <div className="text-sm text-gray-600">
          Track and analyze your competitors to strengthen your market position.
        </div>
        {/* TODO: Add competitor tracking functionality */}
        <div className="mt-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => {
              // TODO: Implement competitor analysis
              console.log('Add competitor analysis');
            }}
          >
            Analyze Competitors
          </button>
        </div>
      </div>
    </Card>
  );
};
