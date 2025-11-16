import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
  organization?: string;
  avatar?: string;
  permissions: string[];
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    features: string[];
  };
  walletConnected?: {
    address: string;
    network: string;
    type: 'polkadot' | 'metamask' | 'substrate';
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  loginWithSSO: (provider: 'google' | 'github' | 'azure' | 'okta') => Promise<void>;
  connectWallet: (type: 'polkadot' | 'metamask') => Promise<void>;
  disconnectWallet: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Simulate API call to verify token and get user data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: '1',
        email: 'developer@polyflow.ai',
        name: 'John Doe',
        role: 'developer',
        organization: 'PolyFlow Technologies',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        permissions: [
          'workflow.create',
          'workflow.edit',
          'xcm.create',
          'code.generate',
          'ai.chat',
        ],
        subscription: {
          plan: 'pro',
          features: [
            'unlimited_workflows',
            'ai_assistance',
            'xcm_builder',
            'code_generation',
            'team_collaboration',
          ],
        },
        walletConnected: {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          network: 'polkadot',
          type: 'polkadot',
        },
      };

      setUser(mockUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (email === 'demo@polyflow.ai' && password === 'demo') {
        const token = 'mock_jwt_token_' + Date.now();
        localStorage.setItem('auth_token', token);
        await checkAuthState();
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('auth_token', token);

      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
        role: 'developer',
        permissions: ['workflow.create', 'xcm.create'],
        subscription: {
          plan: 'free',
          features: ['basic_workflows', 'limited_ai'],
        },
      };

      setUser(newUser);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginWithSSO = async (provider: 'google' | 'github' | 'azure' | 'okta') => {
    setLoading(true);
    try {
      // Simulate SSO flow
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = `sso_${provider}_token_${Date.now()}`;
      localStorage.setItem('auth_token', token);

      const ssoUser: User = {
        id: Date.now().toString(),
        email: `user@${provider}.com`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        role: 'developer',
        organization: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Corp`,
        permissions: ['workflow.create', 'workflow.edit', 'xcm.create', 'ai.chat'],
        subscription: {
          plan: 'enterprise',
          features: [
            'unlimited_workflows',
            'ai_assistance',
            'xcm_builder',
            'code_generation',
            'team_collaboration',
            'enterprise_support',
            'sso_integration',
          ],
        },
      };

      setUser(ssoUser);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const connectWallet = async (type: 'polkadot' | 'metamask') => {
    try {
      if (type === 'polkadot') {
        // Simulate Polkadot extension connection
        const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');

        const extensions = await web3Enable('PolyFlow AI');
        if (extensions.length === 0) {
          throw new Error('No Polkadot extension found');
        }

        const accounts = await web3Accounts();
        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const walletInfo = {
          address: accounts[0].address,
          network: 'polkadot',
          type: type as const,
        };

        setUser(prev => prev ? { ...prev, walletConnected: walletInfo } : null);
      } else if (type === 'metamask') {
        // Simulate MetaMask connection
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });

          const walletInfo = {
            address: accounts[0],
            network: 'ethereum',
            type: type as const,
          };

          setUser(prev => prev ? { ...prev, walletConnected: walletInfo } : null);
        } else {
          throw new Error('MetaMask not found');
        }
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    setUser(prev => prev ? { ...prev, walletConnected: undefined } : null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signUp,
    loginWithSSO,
    connectWallet,
    disconnectWallet,
    updateProfile,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;