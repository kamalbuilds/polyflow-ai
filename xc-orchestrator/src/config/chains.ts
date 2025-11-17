import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  polkadot: {
    id: 'polkadot',
    name: 'Polkadot',
    wsEndpoint: process.env.POLKADOT_WS_ENDPOINT || 'wss://rpc.polkadot.io',
    isRelay: true,
    nativeToken: 'DOT',
    decimals: 10,
    ss58Format: 0,
    blockTime: 6000,
    maxRetries: 3,
    retryDelay: 2000
  },
  kusama: {
    id: 'kusama',
    name: 'Kusama',
    wsEndpoint: process.env.KUSAMA_WS_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
    isRelay: true,
    nativeToken: 'KSM',
    decimals: 12,
    ss58Format: 2,
    blockTime: 6000,
    maxRetries: 3,
    retryDelay: 2000
  },
  assetHub: {
    id: 'assetHub',
    name: 'Asset Hub',
    wsEndpoint: process.env.ASSETHUB_POLKADOT_WS_ENDPOINT || 'wss://polkadot-asset-hub-rpc.polkadot.io',
    parachainId: 1000,
    isRelay: false,
    nativeToken: 'DOT',
    decimals: 10,
    ss58Format: 0,
    blockTime: 12000,
    maxRetries: 3,
    retryDelay: 2000
  },
  assetHubKusama: {
    id: 'assetHubKusama',
    name: 'Asset Hub Kusama',
    wsEndpoint: process.env.ASSETHUB_KUSAMA_WS_ENDPOINT || 'wss://kusama-asset-hub-rpc.polkadot.io',
    parachainId: 1000,
    isRelay: false,
    nativeToken: 'KSM',
    decimals: 12,
    ss58Format: 2,
    blockTime: 12000,
    maxRetries: 3,
    retryDelay: 2000
  },
  hydration: {
    id: 'hydration',
    name: 'Hydration',
    wsEndpoint: process.env.HYDRATION_WS_ENDPOINT || 'wss://rpc.hydradx.cloud',
    parachainId: 2034,
    isRelay: false,
    nativeToken: 'HDX',
    decimals: 12,
    ss58Format: 63,
    blockTime: 12000,
    maxRetries: 3,
    retryDelay: 2000
  },
  moonbeam: {
    id: 'moonbeam',
    name: 'Moonbeam',
    wsEndpoint: process.env.MOONBEAM_WS_ENDPOINT || 'wss://wss.api.moonbeam.network',
    parachainId: 2004,
    isRelay: false,
    nativeToken: 'GLMR',
    decimals: 18,
    ss58Format: 1284,
    blockTime: 12000,
    maxRetries: 3,
    retryDelay: 2000
  },
  astar: {
    id: 'astar',
    name: 'Astar',
    wsEndpoint: process.env.ASTAR_WS_ENDPOINT || 'wss://rpc.astar.network',
    parachainId: 2006,
    isRelay: false,
    nativeToken: 'ASTR',
    decimals: 18,
    ss58Format: 5,
    blockTime: 12000,
    maxRetries: 3,
    retryDelay: 2000
  }
};

export const SUPPORTED_ASSETS = {
  DOT: {
    assetId: 'native',
    symbol: 'DOT',
    decimals: 10,
    minBalance: '10000000000', // 1 DOT
    isNative: true
  },
  KSM: {
    assetId: 'native',
    symbol: 'KSM',
    decimals: 12,
    minBalance: '100000000000', // 0.1 KSM
    isNative: true
  },
  HDX: {
    assetId: 'native',
    symbol: 'HDX',
    decimals: 12,
    minBalance: '1000000000000', // 1 HDX
    isNative: true
  },
  USDT: {
    assetId: 1984,
    symbol: 'USDT',
    decimals: 6,
    minBalance: '10000', // 0.01 USDT
    isNative: false,
    location: {
      parents: 0,
      interior: {
        X2: [
          { PalletInstance: 50 },
          { GeneralIndex: 1984 }
        ]
      }
    }
  },
  USDC: {
    assetId: 1337,
    symbol: 'USDC',
    decimals: 6,
    minBalance: '10000', // 0.01 USDC
    isNative: false,
    location: {
      parents: 0,
      interior: {
        X2: [
          { PalletInstance: 50 },
          { GeneralIndex: 1337 }
        ]
      }
    }
  }
};

export const XCM_ROUTES = {
  // Polkadot <-> Asset Hub
  'polkadot-assetHub': {
    fees: {
      DOT: '4000000000', // 0.4 DOT
      USDT: '1000000', // 1 USDT
      USDC: '1000000' // 1 USDC
    },
    estimatedDuration: 24000, // 2 blocks
    confidence: 0.95
  },
  'assetHub-polkadot': {
    fees: {
      DOT: '4000000000',
      USDT: '1000000',
      USDC: '1000000'
    },
    estimatedDuration: 24000,
    confidence: 0.95
  },
  // Asset Hub <-> Hydration
  'assetHub-hydration': {
    fees: {
      DOT: '8000000000', // 0.8 DOT
      USDT: '2000000', // 2 USDT
      HDX: '10000000000000' // 10 HDX
    },
    estimatedDuration: 48000, // 4 blocks
    confidence: 0.90
  },
  'hydration-assetHub': {
    fees: {
      DOT: '8000000000',
      USDT: '2000000',
      HDX: '10000000000000'
    },
    estimatedDuration: 48000,
    confidence: 0.90
  },
  // Polkadot <-> Hydration (via Asset Hub)
  'polkadot-hydration': {
    fees: {
      DOT: '12000000000', // 1.2 DOT
      USDT: '3000000' // 3 USDT
    },
    estimatedDuration: 72000, // 6 blocks
    confidence: 0.85
  },
  'hydration-polkadot': {
    fees: {
      DOT: '12000000000',
      USDT: '3000000'
    },
    estimatedDuration: 72000,
    confidence: 0.85
  }
};