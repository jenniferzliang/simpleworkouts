import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/index.ts';
import { WorkoutSessionSummary } from '../types/index.ts';

const SessionHistory: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch sessions list
  const { 
    data: sessionsData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions({ limit: 50 }),
  });

  // Fetch selected session detail
  const { 
    data: sessionDetail,
    isLoading: isLoadingDetail 
  } = useQuery({
    queryKey: ['session', selectedSession],
    queryFn: () => selectedSession ? api.getSession(selectedSession) : null,
    enabled: !!selectedSession,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center text-red-600">
          Failed to load sessions: {error.message}
        </div>
      </div>
    );
  }

  const sessions = sessionsData?.sessions || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Workout History
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Sessions ({sessions.length})
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No workout sessions found. Start by logging your first workout!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isSelected={selectedSession === session.id}
                    onClick={() => setSelectedSession(session.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Detail */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              Session Detail
            </h2>
          </div>
          <div className="p-4">
            {!selectedSession ? (
              <div className="text-center text-gray-500 py-8">
                Select a session to view details
              </div>
            ) : isLoadingDetail ? (
              <div className="text-center text-gray-500 py-8">
                Loading session details...
              </div>
            ) : sessionDetail ? (
              <SessionDetail session={sessionDetail} />
            ) : (
              <div className="text-center text-red-500 py-8">
                Failed to load session details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionCard: React.FC<{
  session: WorkoutSessionSummary;
  isSelected: boolean;
  onClick: () => void;
}> = ({ session, isSelected, onClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-medium text-gray-900">
          {formatDate(session.performedDate)}
        </div>
        <div className="text-sm text-gray-500">
          {session.totals.tonnage.toFixed(1)} lbs
        </div>
      </div>
      
      <div className="text-xs text-gray-600 mb-2 line-clamp-2">
        {session.sourceText}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{session.totals.sets} sets • {session.totals.reps} reps</span>
        {session.totals.bwReps > 0 && (
          <span>{session.totals.bwReps} BW reps</span>
        )}
      </div>
    </div>
  );
};

const SessionDetail: React.FC<{ session: any }> = ({ session }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Session Info */}
      <div>
        <h3 className="font-medium text-gray-900 mb-2">
          {formatDateTime(session.performedAtLocal)}
        </h3>
        
        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <span className="text-gray-600">Total Tonnage:</span>
            <div className="font-medium">{session.totals.tonnage.toFixed(1)} lbs</div>
          </div>
          <div>
            <span className="text-gray-600">Total Sets:</span>
            <div className="font-medium">{session.totals.sets}</div>
          </div>
          <div>
            <span className="text-gray-600">Total Reps:</span>
            <div className="font-medium">{session.totals.reps}</div>
          </div>
          <div>
            <span className="text-gray-600">BW Reps:</span>
            <div className="font-medium">{session.totals.bwReps}</div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {session.notes && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {session.notes}
          </p>
        </div>
      )}

      {/* Exercises */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Exercises ({session.exercises.length})
        </h4>
        <div className="space-y-3">
          {session.exercises.map((exercise: any) => (
            <div key={exercise.id} className="border border-gray-200 rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-gray-900">
                  {exercise.exercise.name}
                </h5>
                <span className="text-xs text-gray-500">
                  {exercise.sets.length} sets
                </span>
              </div>
              
              {/* Sets */}
              <div className="space-y-1">
                {exercise.sets.map((set: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Set {set.setNumber}: {set.reps} reps
                    </span>
                    <span className="text-gray-900">
                      {set.isBodyweight ? (
                        <span className="text-orange-600 font-medium">BW</span>
                      ) : set.weight ? (
                        `${set.weight} ${set.unit}`
                      ) : (
                        '-'
                      )}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Exercise Totals */}
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                {exercise.totals.tonnage > 0 && (
                  <span>{exercise.totals.tonnage.toFixed(1)} lbs • </span>
                )}
                {exercise.totals.reps} total reps
                {exercise.totals.bwReps > 0 && (
                  <span> • {exercise.totals.bwReps} BW reps</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Original Text */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">Original Text</h4>
        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono whitespace-pre-wrap">
          {session.sourceText}
        </pre>
      </div>
    </div>
  );
};

export default SessionHistory;