import React from 'react';
import { ParseResult, ParsedExercise, ParseWarning, WorkoutSet } from '../types/index.ts';

interface ParsePreviewProps {
  parseResult: ParseResult;
  unitPreference: 'kg' | 'lb';
}

const ParsePreview: React.FC<ParsePreviewProps> = ({ parseResult, unitPreference }) => {
  const { exercises, warnings, metadata } = parseResult;

  // Calculate totals
  const totals = exercises.reduce(
    (acc, exercise) => {
      exercise.sets.forEach(set => {
        acc.totalSets++;
        acc.totalReps += set.reps;
        if (set.isBodyweight) {
          acc.totalBwReps += set.reps;
        } else if (set.weight) {
          acc.totalTonnage += set.weight * set.reps;
        }
      });
      return acc;
    },
    { totalSets: 0, totalReps: 0, totalTonnage: 0, totalBwReps: 0 }
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Workout Preview
        </h2>
        {metadata && (
          <span className="text-sm text-gray-500">
            Parsed in {metadata.duration}ms
          </span>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Warnings ({warnings.length})
          </h3>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <WarningCard key={index} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">{exercises.length}</span>
            <span className="text-blue-600 ml-1">exercises</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">{totals.totalSets}</span>
            <span className="text-blue-600 ml-1">sets</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">{totals.totalTonnage.toFixed(1)}</span>
            <span className="text-blue-600 ml-1">{unitPreference} tonnage</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">{totals.totalBwReps}</span>
            <span className="text-blue-600 ml-1">BW reps</span>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        {exercises.map((exercise, index) => (
          <ExerciseCard 
            key={index} 
            exercise={exercise} 
            unitPreference={unitPreference}
          />
        ))}
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No valid exercises found. Check the warnings above for details.
        </div>
      )}
    </div>
  );
};

const WarningCard: React.FC<{ warning: ParseWarning }> = ({ warning }) => {
  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Line {warning.line}:</span> {warning.message}
          </p>
          {warning.suggestion && (
            <p className="text-xs text-yellow-700 mt-1">
              💡 {warning.suggestion}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-yellow-700 font-mono bg-yellow-100 px-2 py-1 rounded">
        {warning.originalText}
      </div>
    </div>
  );
};

const ExerciseCard: React.FC<{ 
  exercise: ParsedExercise; 
  unitPreference: 'kg' | 'lb';
}> = ({ exercise, unitPreference }) => {
  const { exercise: exerciseInfo, sets, mode, originalText } = exercise;

  // Calculate exercise totals
  const exerciseTotals = sets.reduce(
    (acc, set) => {
      acc.totalReps += set.reps;
      if (set.isBodyweight) {
        acc.totalBwReps += set.reps;
      } else if (set.weight) {
        acc.totalTonnage += set.weight * set.reps;
      }
      return acc;
    },
    { totalReps: 0, totalTonnage: 0, totalBwReps: 0 }
  );

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'aggregate': return 'bg-green-100 text-green-800';
      case 'per-set': return 'bg-blue-100 text-blue-800';
      case 'reps-only': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'push': return 'bg-red-100 text-red-800';
      case 'pull': return 'bg-blue-100 text-blue-800';
      case 'legs': return 'bg-green-100 text-green-800';
      case 'core': return 'bg-yellow-100 text-yellow-800';
      case 'cardio': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      {/* Exercise Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{exerciseInfo.name}</h4>
          <div className="flex space-x-2 mt-1">
            <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(exerciseInfo.category)}`}>
              {exerciseInfo.category}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getModeColor(mode)}`}>
              {mode}
            </span>
            {exerciseInfo.isBodyweight && (
              <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                bodyweight
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>{sets.length} sets • {exerciseTotals.totalReps} reps</div>
          {exerciseTotals.totalTonnage > 0 && (
            <div className="font-medium">
              {exerciseTotals.totalTonnage.toFixed(1)} {unitPreference}
            </div>
          )}
        </div>
      </div>

      {/* Sets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Set
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reps
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Load
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sets.map((set, index) => (
              <SetRow 
                key={index} 
                set={set} 
                unitPreference={unitPreference}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Original Text */}
      <div className="mt-3 text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
        {originalText}
      </div>
    </div>
  );
};

const SetRow: React.FC<{ set: WorkoutSet; unitPreference: 'kg' | 'lb' }> = ({ 
  set, 
  unitPreference 
}) => {
  const load = set.weight && !set.isBodyweight ? set.weight * set.reps : 0;

  return (
    <tr>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
        {set.setNumber}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
        {set.reps}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
        {set.isBodyweight ? (
          <span className="text-orange-600 font-medium">BW</span>
        ) : set.weight ? (
          `${set.weight} ${set.unit || unitPreference}`
        ) : (
          '-'
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
        {load > 0 ? `${load.toFixed(1)} ${unitPreference}` : '-'}
      </td>
    </tr>
  );
};

export default ParsePreview;