import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/index.ts';
import { ParseResult, ParsedExercise, ParseWarning } from '../types/index.ts';
import ParsePreview from './ParsePreview.tsx';

const SAMPLE_WORKOUTS = [
  `Bench Press 3x5x135
Squat 5x5x225
Barbell Row 3x5x115
Overhead Press 3x5x95
Deadlift 1x5x275`,
  
  `Push-ups 12 10 8
Pull-ups 3x8 bw
Plank 3x60`,
  
  `Lat Pulldown 12x40kg 10x45kg 8x45kg
Incline DB Press 12x20kg 12x20kg 12x20kg
DB Row 12x30lb 12x30lb 10x30lb`
];

const WorkoutInput: React.FC = () => {
  const [workoutText, setWorkoutText] = useState('');
  const [unitPreference, setUnitPreference] = useState<'kg' | 'lb'>('lb');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: ({ text, unit }: { text: string; unit: 'kg' | 'lb' }) => 
      api.parseWorkout(text, unit),
    onSuccess: (data) => {
      setParseResult(data);
      setShowPreview(true);
    },
    onError: (error) => {
      console.error('Parse error:', error);
    }
  });

  // Save session mutation
  const saveMutation = useMutation({
    mutationFn: (data: { text: string; parsed: ParseResult; notes?: string }) =>
      api.createSession(data),
    onSuccess: (data) => {
      // Show success message and reset
      alert(`Workout saved! Total tonnage: ${data.totals.tonnage}lbs`);
      setWorkoutText('');
      setParseResult(null);
      setShowPreview(false);
    },
    onError: (error) => {
      console.error('Save error:', error);
      alert('Failed to save workout. Please try again.');
    }
  });

  const handleParse = useCallback(() => {
    if (!workoutText.trim()) return;
    parseMutation.mutate({ text: workoutText, unit: unitPreference });
  }, [workoutText, unitPreference, parseMutation]);

  const handleSave = useCallback(() => {
    if (!parseResult) return;
    saveMutation.mutate({ text: workoutText, parsed: parseResult });
  }, [workoutText, parseResult, saveMutation]);

  const loadSample = (index: number) => {
    setWorkoutText(SAMPLE_WORKOUTS[index]);
    setShowPreview(false);
    setParseResult(null);
  };

  const isLoading = parseMutation.isPending || saveMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Log Your Workout
          </h1>

          {/* Unit Preference */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Preference
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="unit"
                  value="lb"
                  checked={unitPreference === 'lb'}
                  onChange={(e) => setUnitPreference(e.target.value as 'lb')}
                  className="mr-2"
                />
                Pounds (lb)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="unit"
                  value="kg"
                  checked={unitPreference === 'kg'}
                  onChange={(e) => setUnitPreference(e.target.value as 'kg')}
                  className="mr-2"
                />
                Kilograms (kg)
              </label>
            </div>
          </div>

          {/* Sample Workouts */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sample Workouts
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadSample(0)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Strength Training
              </button>
              <button
                onClick={() => loadSample(1)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Bodyweight
              </button>
              <button
                onClick={() => loadSample(2)}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Hypertrophy
              </button>
            </div>
          </div>

          {/* Workout Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workout Text
            </label>
            <textarea
              value={workoutText}
              onChange={(e) => setWorkoutText(e.target.value)}
              placeholder={`Enter your workout, one exercise per line:

Bench Press 3x5x135
Squat 5x5x225
Pull-ups 3x8 bw
Push-ups 12 10 8`}
              className="w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Format: Exercise name, then sets×reps×weight (e.g., "Bench Press 3x5x135") or reps only for bodyweight
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleParse}
              disabled={!workoutText.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parseMutation.isPending ? 'Parsing...' : 'Parse Workout'}
            </button>
            
            {showPreview && parseResult && (
              <button
                onClick={handleSave}
                disabled={isLoading || parseResult.exercises.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Workout'}
              </button>
            )}
          </div>

          {/* Error Display */}
          {parseMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">
                Failed to parse workout: {parseMutation.error?.message}
              </p>
            </div>
          )}
        </div>

        {/* Parse Preview */}
        {showPreview && parseResult && (
          <div className="border-t bg-gray-50">
            <ParsePreview 
              parseResult={parseResult}
              unitPreference={unitPreference}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutInput;