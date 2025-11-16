import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  hash: string;
  type: 'xcm' | 'transfer' | 'contract' | 'governance';
  status: 'pending' | 'success' | 'failed' | 'timeout';
  sourceChain: {
    name: string;
    id: string;
    blockNumber?: number;
  };
  destinationChain: {
    name: string;
    id: string;
    blockNumber?: number;
  };
  amount?: string;
  asset: string;
  sender: string;
  recipient: string;
  timestamp: Date;
  confirmations: number;
  requiredConfirmations: number;
  gasUsed?: string;
  gasFee?: string;
  xcmInfo?: {
    messageHash: string;
    outcome: string;
    error?: string;
  };
}

interface TransactionMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Mock data generator
  const generateMockTransaction = (): Transaction => {
    const types: Transaction['type'][] = ['xcm', 'transfer', 'contract', 'governance'];
    const statuses: Transaction['status'][] = ['pending', 'success', 'failed', 'timeout'];
    const chains = [
      { name: 'Polkadot', id: '0' },
      { name: 'Kusama', id: '1' },
      { name: 'Acala', id: '2000' },
      { name: 'Moonbeam', id: '2004' },
      { name: 'Astar', id: '2006' },
      { name: 'Parallel', id: '2012' },
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const sourceChain = chains[Math.floor(Math.random() * chains.length)];
    const destinationChain = chains.filter(c => c.id !== sourceChain.id)[Math.floor(Math.random() * (chains.length - 1))];

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type,
      status,
      sourceChain: {
        ...sourceChain,
        blockNumber: Math.floor(Math.random() * 1000000),
      },
      destinationChain: {
        ...destinationChain,
        blockNumber: Math.floor(Math.random() * 1000000),
      },
      amount: (Math.random() * 1000).toFixed(4),
      asset: 'DOT',
      sender: '5' + Array.from({ length: 47 }, () => Math.floor(Math.random() * 36).toString(36)).join(''),
      recipient: '5' + Array.from({ length: 47 }, () => Math.floor(Math.random() * 36).toString(36)).join(''),
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      confirmations: Math.floor(Math.random() * 20),
      requiredConfirmations: 12,
      gasUsed: (Math.random() * 100000).toFixed(0),
      gasFee: (Math.random() * 10).toFixed(6),
      xcmInfo: type === 'xcm' ? {
        messageHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        outcome: status === 'success' ? 'Complete' : 'Incomplete',
        error: status === 'failed' ? 'Insufficient funds on destination chain' : undefined,
      } : undefined,
    };
  };

  // Initialize with mock data
  useEffect(() => {
    const mockData = Array.from({ length: 15 }, generateMockTransaction);
    setTransactions(mockData);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate new transactions
      if (Math.random() > 0.7) {
        setTransactions(prev => [generateMockTransaction(), ...prev.slice(0, 49)]);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter transactions
  useEffect(() => {
    let filtered = [...transactions];

    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.sourceChain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.destinationChain.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, statusFilter, typeFilter]);

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'timeout':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'xcm':
        return 'bg-purple-100 text-purple-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'contract':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatAmount = (amount: string, asset: string) => {
    return `${parseFloat(amount).toLocaleString()} ${asset}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Cross-Chain Transaction Monitor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time monitoring of cross-chain transactions and XCM messages
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLoading(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="timeout">Timeout</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="xcm">XCM Messages</option>
            <option value="transfer">Transfers</option>
            <option value="contract">Contracts</option>
            <option value="governance">Governance</option>
          </select>
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{transactions.filter(tx => tx.status === 'success').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{transactions.filter(tx => tx.status === 'pending').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{transactions.filter(tx => tx.status === 'failed').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{transactions.filter(tx => tx.type === 'xcm').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">XCM Messages</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Transaction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getStatusIcon(transaction.status)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAddress(transaction.hash)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                          {transaction.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>
                    <div>{transaction.sourceChain.name} → {transaction.destinationChain.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatAddress(transaction.sender)} → {formatAddress(transaction.recipient)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {transaction.amount && formatAmount(transaction.amount, transaction.asset)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                  {transaction.status === 'pending' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {transaction.confirmations}/{transaction.requiredConfirmations} confirmations
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {transaction.timestamp.toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedTransaction(transaction)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hash</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{selectedTransaction.hash}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              {selectedTransaction.xcmInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">XCM Details</label>
                  <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="text-sm"><strong>Message Hash:</strong> {selectedTransaction.xcmInfo.messageHash}</p>
                    <p className="text-sm"><strong>Outcome:</strong> {selectedTransaction.xcmInfo.outcome}</p>
                    {selectedTransaction.xcmInfo.error && (
                      <p className="text-sm text-red-600"><strong>Error:</strong> {selectedTransaction.xcmInfo.error}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gas Used</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTransaction.gasUsed}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gas Fee</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTransaction.gasFee} {selectedTransaction.asset}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMonitor;