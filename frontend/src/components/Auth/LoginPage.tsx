import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import {
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  KeyIcon,
  UserCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const { login, loginWithSSO, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: 'demo@polyflow.ai',
    password: 'demo',
  });
  const [error, setError] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleSSOLogin = async (provider: 'google' | 'github' | 'azure' | 'okta') => {
    setError('');
    try {
      await loginWithSSO(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
    }
  };

  const ssoProviders = [
    {
      name: 'Google',
      id: 'google' as const,
      color: 'bg-red-500 hover:bg-red-600',
      icon: '🔍',
    },
    {
      name: 'GitHub',
      id: 'github' as const,
      color: 'bg-gray-800 hover:bg-gray-900',
      icon: '🐱',
    },
    {
      name: 'Microsoft',
      id: 'azure' as const,
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: '🏢',
    },
    {
      name: 'Okta',
      id: 'okta' as const,
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: '🔐',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Welcome to PolyFlow AI
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            The future of cross-chain development is here
          </p>
        </div>

        {/* Demo Credentials Info */}
        <div className="bg-blue-900 bg-opacity-50 border border-blue-400 rounded-lg p-4">
          <h3 className="text-blue-200 font-medium text-sm mb-2">Demo Credentials</h3>
          <div className="text-xs text-blue-100 space-y-1">
            <p><strong>Email:</strong> demo@polyflow.ai</p>
            <p><strong>Password:</strong> demo</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                Email Address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="block w-full px-3 py-2 bg-white bg-opacity-20 border border-gray-300 border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
                <UserCircleIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="block w-full px-3 py-2 bg-white bg-opacity-20 border border-gray-300 border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-purple-400 hover:text-purple-300">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Sign in to PolyFlow AI
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 border-opacity-30" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-300">Enterprise SSO</span>
              </div>
            </div>
          </div>

          {/* SSO Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {ssoProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSSOLogin(provider.id)}
                disabled={loading}
                className={`
                  w-full inline-flex justify-center py-3 px-4 rounded-lg border border-transparent text-sm font-medium text-white
                  ${provider.color} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                `}
              >
                <span className="mr-2 text-lg">{provider.icon}</span>
                {provider.name}
              </button>
            ))}
          </div>

          {/* Blockchain Wallet Options */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 border-opacity-30" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-300">Connect Wallet</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button className="w-full flex items-center justify-center px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors duration-200">
              <GlobeAltIcon className="w-5 h-5 mr-2" />
              Connect Polkadot Wallet
            </button>
            <button className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200">
              <div className="w-5 h-5 mr-2 rounded-full bg-orange-400"></div>
              Connect MetaMask
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-300">
              Don't have an account?{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-purple-400 hover:text-purple-300"
              >
                Sign up for free
              </button>
            </span>
          </div>

          {/* Features Preview */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 mb-3">What you'll get access to:</p>
            <div className="flex justify-center space-x-6 text-xs text-gray-300">
              <span>🧠 AI Assistant</span>
              <span>🔗 XCM Builder</span>
              <span>⚙️ Code Gen</span>
              <span>📊 Analytics</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          <p className="mt-2">© 2024 PolyFlow AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;