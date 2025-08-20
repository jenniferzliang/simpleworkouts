import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface LoginProps {
  onSuccess: (user: any, token: string) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data.user, data.token);
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-4">💪</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back!
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to continue tracking your workouts
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  disabled={loginMutation.isPending}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {loginMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <h4 className="text-red-800 font-medium mb-1">Sign in failed</h4>
                    <p className="text-red-700 text-sm">
                      {loginMutation.error?.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending || !email.trim() || !password.trim()}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                loginMutation.isPending || !email.trim() || !password.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {loginMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Sign in</span>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              Don't have an account? <span className="font-semibold">Sign up</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;