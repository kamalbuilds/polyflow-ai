import React from 'react';
import { AuthProvider, useAuth } from './Auth/AuthProvider';
import LoginPage from './Auth/LoginPage';
import MainLayout from './Layout/MainLayout';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading PolyFlow AI</h2>
          <p className="text-gray-300">Initializing your cross-chain development environment...</p>
        </div>
      </div>
    );
  }

  return user ? <MainLayout /> : <LoginPage />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;