import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkoutInput from './components/WorkoutInput';
import SessionHistory from './components/SessionHistory';
import Analytics from './components/Analytics';
import UserSettings from './components/UserSettings';
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

const MainApp: React.FC = () => {
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
              <NavLink to="/settings" label="Settings" />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <MainApp />
      </Router>
    </QueryClientProvider>
  );
}

export default App;