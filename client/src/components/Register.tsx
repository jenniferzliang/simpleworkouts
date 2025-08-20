import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface RegisterProps {
  onSuccess: (user: any, token: string) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    unitPreference: 'lb' as 'kg' | 'lb'
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      name?: string;
      unitPreference?: 'kg' | 'lb';
    }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data.user, data.token);
    },
    onError: (error) => {
      console.error('Registration error:', error);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    if (formData.password.length < 6) {
      return;
    }

    registerMutation.mutate({
      email: formData.email,
      password: formData.password,
      name: formData.name.trim() || undefined,
      unitPreference: formData.unitPreference
    });
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const passwordValid = formData.password.length >= 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-4">💪</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Join Simple Workouts
          </h2>
          <p className="mt-2 text-gray-600">
            Start tracking your workouts today
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Your name"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div>
                <label htmlFor="unitPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  ⚖️ Unit Preference
                </label>
                <select
                  id="unitPreference"
                  name="unitPreference"
                  value={formData.unitPreference}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={registerMutation.isPending}
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Password (min 6 characters)"
                  disabled={registerMutation.isPending}
                />
                {formData.password && !passwordValid && (
                  <p className="mt-1 text-sm text-red-600">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirm password"
                  disabled={registerMutation.isPending}
                />
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>

            {registerMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <h4 className="text-red-800 font-medium mb-1">Registration failed</h4>
                    <p className="text-red-700 text-sm">
                      {registerMutation.error?.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={
                registerMutation.isPending || 
                !formData.email.trim() || 
                !formData.password.trim() || 
                !passwordValid || 
                !passwordsMatch
              }
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                registerMutation.isPending || 
                !formData.email.trim() || 
                !formData.password.trim() || 
                !passwordValid || 
                !passwordsMatch
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {registerMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Create account</span>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;