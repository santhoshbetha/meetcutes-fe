import React from 'react';
import { MeetCutesSpinner } from '@/components/ui/MeetCutesSpinner';

export function SpinnerDemo() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent mb-4">
          MeetCutes Spinner Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          A romantic-themed spinner matching the MeetCutes app design
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Small</h3>
          <MeetCutesSpinner size="small" />
        </div>

        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Medium</h3>
          <MeetCutesSpinner size="medium" />
        </div>

        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Large</h3>
          <MeetCutesSpinner size="large" />
        </div>

        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">X-Large</h3>
          <MeetCutesSpinner size="xlarge" />
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Features: Gradient ring animation, pulsing heart icon, floating sparkles
        </p>
      </div>
    </div>
  );
}