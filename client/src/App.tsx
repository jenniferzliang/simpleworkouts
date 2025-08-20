import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import WorkoutInput from './components/WorkoutInput.tsx';
import SessionHistory from './components/SessionHistory.tsx';
import Analytics from './components/Analytics.tsx';
import UserSettings from './components/UserSettings.tsx';
import Login from './components/Login.tsx';
import Register from './components/Register.tsx';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const NavLink: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-semibold' 
          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                💪 Simple Workouts
              </Link>
            </div>
            <div className="flex items-center space-x-1">
              <NavLink to="/" label="Log Workout" />
              <NavLink to="/history" label="History" />
              <NavLink to="/analytics" label="Analytics" />
              <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                <Link 
                  to="/settings"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {user?.name || user?.email}
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<WorkoutInput />} />
          <Route path="/history" element={<SessionHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<UserSettings />} />
        </Routes>
      </main>
    </div>
  );
};

const UnauthenticatedApp: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useAuth();

  const handleAuthSuccess = (user: any, token: string) => {
    login(user, token);
  };

  return (
    <>
      {isLogin ? (
        <Login 
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setIsLogin(false)}
        />
      ) : (
        <Register 
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-xl font-semibold text-gray-900 mb-2">
            Simple Workouts
          </div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? <AuthenticatedApp /> : <UnauthenticatedApp />}
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;