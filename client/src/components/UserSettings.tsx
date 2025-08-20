import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext.tsx';

const UserSettings: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    unitPreference: user?.unitPreference || 'lb',
    timezone: user?.timezone || 'America/New_York'
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Update failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      updateUser(data.user);
    },
    onError: (error) => {
      console.error('Update error:', error);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    name: user?.name || '',
    unitPreference: user?.unitPreference || 'lb',
    timezone: user?.timezone || 'America/New_York'
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⚙️ Settings
            </h1>
            <p className="text-gray-600">
              Manage your account and workout preferences
            </p>
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">👤</div>
              <div>
                <h3 className="font-medium text-blue-900">Account</h3>
                <p className="text-sm text-blue-700">{user?.email}</p>
                <p className="text-xs text-blue-600">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'recently'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Your name (optional)"
                disabled={updateProfileMutation.isPending}
              />
            </div>

            <div>
              <label htmlFor="unitPreference" className="block text-sm font-medium text-gray-700 mb-2">
                ⚖️ Default Unit Preference
              </label>
              <select
                id="unitPreference"
                name="unitPreference"
                value={formData.unitPreference}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={updateProfileMutation.isPending}
              >
                <option value="lb">Pounds (lb)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                This will be your default unit when logging workouts
              </p>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                🌍 Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={updateProfileMutation.isPending}
              >
                <option value="America/New_York">Eastern Time (EST/EDT)</option>
                <option value="America/Chicago">Central Time (CST/CDT)</option>
                <option value="America/Denver">Mountain Time (MST/MDT)</option>
                <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                <option value="Europe/London">GMT (London)</option>
                <option value="Europe/Paris">CET (Paris/Berlin)</option>
                <option value="Asia/Tokyo">JST (Tokyo)</option>
                <option value="Australia/Sydney">AEST (Sydney)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Used for accurate workout timestamps and analytics
              </p>
            </div>

            {updateProfileMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <h4 className="text-red-800 font-medium mb-1">Update failed</h4>
                    <p className="text-red-700 text-sm">
                      {updateProfileMutation.error?.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {updateProfileMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-lg">✅</span>
                  <div>
                    <h4 className="text-green-800 font-medium mb-1">Settings updated!</h4>
                    <p className="text-green-700 text-sm">
                      Your preferences have been saved successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || !hasChanges}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  updateProfileMutation.isPending || !hasChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {updateProfileMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;