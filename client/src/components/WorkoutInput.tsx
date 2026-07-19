import React, { useState, useCallback } from 'react';
import { getSettings, createSession } from '../utils/localStorage';
import { WorkoutParser, type ParseResult } from '../utils/workoutParser';
import { sessionFromParseResult } from '../utils/textFormat';
import ParsePreview from './ParsePreview';

const SAMPLE_WORKOUTS = [
  `Bench Press 4x8x185
Incline DB Press 3x10x50
Overhead Press 3x8x95
Lateral Raise 3x12x20
Tricep Extension 3x12x60`,

  `Deadlift 3x5x225
Barbell Row 4x8x135
Pull-ups 3x8 bw
Face Pull 3x15x40
Bicep Curl 3x12x30`,

  `Squat 4x8x185
Leg Press 3x12x270
Leg Curl 3x12x90
Calf Raise 4x15x135`
];

const WorkoutInput: React.FC = () => {
  const settings = getSettings();
  const [workoutText, setWorkoutText] = useState('');
  const [unitPreference, setUnitPreference] = useState<'kg' | 'lb'>(settings.unitPreference);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [isParsing, setIsParsing] = useState(false);

  // Save to local storage
  const handleSaveToLocalStorage = useCallback(() => {
    if (!parseResult) return;

    try {
      const now = new Date();
      const sessionData = sessionFromParseResult(
        parseResult,
        now.toISOString().split('T')[0],
        now.toISOString(),
        workoutText
      );
      createSession(sessionData);

      alert(`Workout saved! Total tonnage: ${sessionData.totalTonnage.toFixed(1)}${unitPreference}`);
      setWorkoutText('');
      setParseResult(null);
      setShowPreview(false);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save workout. Please try again.');
    }
  }, [parseResult, workoutText, unitPreference]);

  const handleParse = useCallback(() => {
    if (!workoutText.trim()) return;

    setIsParsing(true);
    try {
      const parser = new WorkoutParser();
      const result = parser.parseWorkoutText(workoutText, unitPreference);
      setParseResult(result);
      setShowPreview(true);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse workout. Please check your format.');
    } finally {
      setIsParsing(false);
    }
  }, [workoutText, unitPreference]);

  const loadSample = (index: number) => {
    setWorkoutText(SAMPLE_WORKOUTS[index]);
    setShowPreview(false);
    setParseResult(null);
  };

  const isLoading = isParsing;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💪 Log Your Workout
            </h1>
            <p className="text-gray-600">
              Enter your exercises in natural language and we'll parse them for you
            </p>
          </div>

          {/* Unit Preference */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <label className="block text-sm font-medium text-blue-800 mb-3">
              ⚖️ Unit Preference
            </label>
            <div className="flex space-x-4">
              <label className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                unitPreference === 'lb' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}>
                <input
                  type="radio"
                  name="unit"
                  value="lb"
                  checked={unitPreference === 'lb'}
                  onChange={(e) => setUnitPreference(e.target.value as 'lb')}
                  className="sr-only"
                />
                Pounds (lb)
              </label>
              <label className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                unitPreference === 'kg' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}>
                <input
                  type="radio"
                  name="unit"
                  value="kg"
                  checked={unitPreference === 'kg'}
                  onChange={(e) => setUnitPreference(e.target.value as 'kg')}
                  className="sr-only"
                />
                Kilograms (kg)
              </label>
            </div>
          </div>

          {/* Sample Workouts */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📝 Quick Start Templates
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => loadSample(0)}
                className="p-4 text-left bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-blue-600">🏋️</span>
                  <span className="font-medium text-blue-900">Push Day</span>
                </div>
                <p className="text-xs text-blue-700">Chest, shoulders, triceps</p>
              </button>
              <button
                onClick={() => loadSample(1)}
                className="p-4 text-left bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-green-600">💪</span>
                  <span className="font-medium text-green-900">Pull Day</span>
                </div>
                <p className="text-xs text-green-700">Back, biceps, rear delts</p>
              </button>
              <button
                onClick={() => loadSample(2)}
                className="p-4 text-left bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-purple-600">🦵</span>
                  <span className="font-medium text-purple-900">Leg Day</span>
                </div>
                <p className="text-xs text-purple-700">Quads, hamstrings, calves</p>
              </button>
            </div>
          </div>

          {/* Workout Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ✍️ Workout Text
            </label>
            <div className="relative">
              <textarea
                value={workoutText}
                onChange={(e) => setWorkoutText(e.target.value)}
                placeholder={`Enter your workout, one exercise per line:

Bench Press 3x5x135
Squat 5x5x225
Pull-ups 3x8 bw
Push-ups 12 10 8`}
                className={`w-full h-48 p-4 border-2 rounded-lg font-mono text-sm transition-all duration-200 ${
                  workoutText.trim() 
                    ? 'border-blue-300 bg-blue-50/30' 
                    : 'border-gray-200 hover:border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none`}
                disabled={isLoading}
              />
              {workoutText.trim() && (
                <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                  {workoutText.split('\n').filter(line => line.trim()).length} lines
                </div>
              )}
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 flex items-start space-x-2">
                <span className="text-gray-400">💡</span>
                <span>
                  <strong>Format:</strong> Exercise name, then sets×reps×weight (e.g., "Bench Press 3x5x135") or reps only for bodyweight exercises
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleParse}
              disabled={!workoutText.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? 'Parsing...' : 'Parse Workout'}
            </button>
            
            {showPreview && parseResult && (
              <button
                onClick={handleSaveToLocalStorage}
                disabled={isLoading || parseResult.exercises.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Workout
              </button>
            )}
          </div>

          {/* Warnings Display */}
          {parseResult && parseResult.warnings.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 font-medium mb-2">Warnings:</p>
              <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                {parseResult.warnings.map((warning, idx) => (
                  <li key={idx}>
                    Line {warning.line}: {warning.message}
                  </li>
                ))}
              </ul>
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