import React, { useRef, useState } from 'react';
import { getSessions, importSessions, WorkoutSession } from '../utils/localStorage';
import {
  buildExport,
  buildTextExportFile,
  exportFileName,
  parseImportFile,
  ImportPreview,
} from '../utils/importExport';

// Content fingerprint used to flag likely re-imports even when the
// incoming session has a freshly generated id (e.g. text imports)
const contentKey = (session: WorkoutSession): string =>
  `${session.performedDate}|${session.totalSets}|${session.totalReps}|${session.totalTonnage.toFixed(1)}`;

const ImportExport: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resultMessage, setResultMessage] = useState('');

  const sessionCount = getSessions().length;

  const download = (content: string, extension: 'txt' | 'json', mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(extension);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => download(buildTextExportFile(), 'txt', 'text/plain');

  const handleExportJson = () =>
    download(JSON.stringify(buildExport(), null, 2), 'json', 'application/json');

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    const parsed = parseImportFile(await file.text());
    const existing = getSessions();
    const existingIds = new Set(existing.map(s => s.sessionId));
    const existingKeys = new Set(existing.map(contentKey));
    const duplicates = new Set(
      parsed.sessions
        .filter(s => existingIds.has(s.sessionId) || existingKeys.has(contentKey(s)))
        .map(s => s.sessionId)
    );

    setResultMessage('');
    setPreview(parsed);
    setDuplicateIds(duplicates);
    // Preselect everything that isn't already in history
    setSelectedIds(
      new Set(parsed.sessions.filter(s => !duplicates.has(s.sessionId)).map(s => s.sessionId))
    );
  };

  const toggleSelected = (sessionId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleImport = () => {
    if (!preview) return;
    const toImport = preview.sessions.filter(s => selectedIds.has(s.sessionId));
    const { imported, skipped } = importSessions(toImport);
    setPreview(null);
    setResultMessage(
      `Imported ${imported} workout${imported === 1 ? '' : 's'}` +
        (skipped > 0 ? ` (${skipped} already in history)` : '')
    );
  };

  const handleCancel = () => {
    setPreview(null);
    setResultMessage('');
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">📦 Import & Export</h2>
        <p className="text-sm text-gray-600 mb-6">
          Back up your workouts as a readable text file in the same notation you log with
          (dates as <code className="text-xs bg-gray-100 px-1 rounded"># 2026-07-16</code> headers),
          then import it back here — or into another browser. JSON export is also available,
          and both formats can be imported.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={handleExportText}
            disabled={sessionCount === 0}
            className={`py-3 px-4 rounded-lg font-medium border transition-all duration-200 ${
              sessionCount === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>⬇️</span>
              <span>Export Text ({sessionCount})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={sessionCount === 0}
            className={`py-3 px-4 rounded-lg font-medium border transition-all duration-200 ${
              sessionCount === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>⬇️</span>
              <span>Export JSON</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-3 px-4 rounded-lg font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-2">
              <span>⬆️</span>
              <span>Import…</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.md,text/plain,application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>

        {resultMessage && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <p className="text-green-800 font-medium">{resultMessage}</p>
            </div>
          </div>
        )}

        {preview && (
          <ImportReview
            preview={preview}
            duplicateIds={duplicateIds}
            selectedIds={selectedIds}
            onToggle={toggleSelected}
            onImport={handleImport}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

const ImportReview: React.FC<{
  preview: ImportPreview;
  duplicateIds: Set<string>;
  selectedIds: Set<string>;
  onToggle: (sessionId: string) => void;
  onImport: () => void;
  onCancel: () => void;
}> = ({ preview, duplicateIds, selectedIds, onToggle, onImport, onCancel }) => {
  const selectedCount = selectedIds.size;

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Review Import</h3>
      <p className="text-sm text-gray-600 mb-4">
        {preview.sessions.length === 0
          ? 'No workouts could be read from this file.'
          : `Found ${preview.sessions.length} workout${
              preview.sessions.length === 1 ? '' : 's'
            }. Review and uncheck any you don't want, then import.`}
      </p>

      {preview.errors.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-yellow-800 font-medium mb-1">
            ⚠️ {preview.errors.length} item{preview.errors.length === 1 ? '' : 's'} couldn't be read
          </h4>
          <ul className="text-sm text-yellow-700 list-disc list-inside">
            {preview.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.sessions.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto mb-4">
          {preview.sessions.map(session => (
            <ImportSessionRow
              key={session.sessionId}
              session={session}
              isDuplicate={duplicateIds.has(session.sessionId)}
              isSelected={selectedIds.has(session.sessionId)}
              onToggle={() => onToggle(session.sessionId)}
            />
          ))}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onImport}
          disabled={selectedCount === 0}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            selectedCount === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Import {selectedCount} Workout{selectedCount === 1 ? '' : 's'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 rounded-lg font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const ImportSessionRow: React.FC<{
  session: WorkoutSession;
  isDuplicate: boolean;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ session, isDuplicate, isSelected, onToggle }) => {
  const exerciseSummary = session.exercises.map(ex => ex.exerciseName).join(', ');

  return (
    <label
      className={`flex items-start space-x-3 p-4 ${
        isDuplicate ? 'bg-gray-50 opacity-60' : 'cursor-pointer hover:bg-gray-50'
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        disabled={isDuplicate}
        onChange={onToggle}
        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-900">{session.performedDate}</span>
          {isDuplicate ? (
            <span className="text-xs text-gray-500 font-medium">Already in history</span>
          ) : (
            <span className="text-sm text-gray-500">{session.totalTonnage.toFixed(1)} lbs</span>
          )}
        </div>
        <p className="text-xs text-gray-600 truncate">{exerciseSummary}</p>
        <p className="text-xs text-gray-500">
          {session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'} •{' '}
          {session.totalSets} sets • {session.totalReps} reps
          {session.totalBwReps > 0 && ` • ${session.totalBwReps} BW reps`}
        </p>
      </div>
    </label>
  );
};

export default ImportExport;
