import React, { useState, useEffect } from 'react';
import { getSessions, getSession, WorkoutSession } from '../utils/localStorage';

const SessionHistory: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  // Load sessions from local storage
  useEffect(() => {
    const loadedSessions = getSessions();
    // Sort by date descending
    const sorted = loadedSessions.sort((a, b) =>
      b.performedDate.localeCompare(a.performedDate)
    );
    setSessions(sorted);
  }, []);

  // Load selected session detail
  useEffect(() => {
    if (selectedSessionId) {
      const session = getSession(selectedSessionId);
      setSelectedSession(session);
    } else {
      setSelectedSession(null);
    }
  }, [selectedSessionId]);

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
                    key={session.sessionId}
                    session={session}
                    isSelected={selectedSessionId === session.sessionId}
                    onClick={() => setSelectedSessionId(session.sessionId)}
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
            ) : (
              <SessionDetail session={selectedSession} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionCard: React.FC<{
  session: WorkoutSession;
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
          {session.totalTonnage.toFixed(1)} lbs
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-2 line-clamp-2">
        {session.sourceText}
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{session.totalSets} sets • {session.totalReps} reps</span>
        {session.totalBwReps > 0 && (
          <span>{session.totalBwReps} BW reps</span>
        )}
      </div>
    </div>
  );
};

const SessionDetail: React.FC<{ session: WorkoutSession }> = ({ session }) => {
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
            <div className="font-medium">{session.totalTonnage.toFixed(1)} lbs</div>
          </div>
          <div>
            <span className="text-gray-600">Total Sets:</span>
            <div className="font-medium">{session.totalSets}</div>
          </div>
          <div>
            <span className="text-gray-600">Total Reps:</span>
            <div className="font-medium">{session.totalReps}</div>
          </div>
          <div>
            <span className="text-gray-600">BW Reps:</span>
            <div className="font-medium">{session.totalBwReps}</div>
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
          {session.exercises.map((exercise) => (
            <div key={exercise.exerciseId} className="border border-gray-200 rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-gray-900">
                  {exercise.exerciseName}
                </h5>
                <span className="text-xs text-gray-500">
                  {exercise.sets.length} sets
                </span>
              </div>

              {/* Sets */}
              <div className="space-y-1">
                {exercise.sets.map((set, index) => (
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
                {exercise.totalTonnage > 0 && (
                  <span>{exercise.totalTonnage.toFixed(1)} lbs • </span>
                )}
                {exercise.totalReps} total reps
                {exercise.totalBwReps > 0 && (
                  <span> • {exercise.totalBwReps} BW reps</span>
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