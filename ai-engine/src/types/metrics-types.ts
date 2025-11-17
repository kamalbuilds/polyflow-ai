/**
 * Type definitions for Metrics Collector
 */

export interface MetricsData {
  type: 'code_generation' | 'code_analysis' | 'user_interaction' | 'system' | 'performance' | 'feedback' | 'alert';
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface CodeGenerationMetrics {
  requestId: string;
  intent?: string;
  language?: string;
  framework?: string;
  tokenCount?: number;
  responseTime: number;
  success: boolean;
  error?: string;
  confidence?: number;
  templateUsed?: string;
  strategy?: string;
  userId?: string;
}

export interface CodeAnalysisMetrics {
  requestId: string;
  language: string;
  codeLength: number;
  tokenCount: number;
  responseTime: number;
  success: boolean;
  error?: string;
  securityIssues?: number;
  performanceIssues?: number;
  qualityScore?: number;
  userId?: string;
}

export interface UserMetrics {
  sessionId?: string;
  userId?: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
  ipAddress?: string;
  timestamp?: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  cpuUsage: {
    user: number;
    system: number;
  };
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  uptime: number;
  eventLoopLag: number;
  processId?: number;
  nodeVersion?: string;
}

export interface PerformanceMetrics {
  timestamp: Date;
  codeGenerationStats: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  codeAnalysisStats: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  apiStats: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
  feedbackStats: {
    total: number;
    averageRating: number;
  };
}

export interface MetricsQuery {
  metric: string;
  startTime: Date;
  endTime: Date;
  aggregation?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
  groupBy?: string[];
  limit?: number;
}

export interface MetricsResponse {
  metric: string;
  startTime: Date;
  endTime: Date;
  data: Array<{
    timestamp: Date;
    value?: number;
    values?: Record<string, number>;
    metadata?: Record<string, any>;
  }>;
  aggregation: string;
  total?: number;
  average?: number;
  min?: number;
  max?: number;
}

export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  timeWindow: number; // seconds
  enabled: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels?: string[]; // notification channels
  conditions?: AlertCondition[];
}

export interface AlertCondition {
  metric: string;
  operator: 'and' | 'or';
  threshold: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
}

export interface MetricsAlert {
  id: string;
  alertId: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: {
    metric?: string;
    currentValue?: number;
    threshold?: number;
    [key: string]: any;
  };
}

export interface DashboardMetrics {
  overview: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    activeUsers: number;
  };
  codeGeneration: {
    totalGenerated: number;
    successRate: number;
    averageConfidence: number;
    popularLanguages: Array<{
      language: string;
      count: number;
    }>;
    popularFrameworks: Array<{
      framework: string;
      count: number;
    }>;
  };
  codeAnalysis: {
    totalAnalyzed: number;
    averageQualityScore: number;
    commonIssues: Array<{
      type: string;
      count: number;
    }>;
  };
  performance: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
}

export interface MetricsSummary {
  period: {
    start: Date;
    end: Date;
  };
  highlights: {
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    averageResponseTime: number;
    userSatisfaction: number;
  };
  trends: {
    requestVolume: TrendData;
    responseTime: TrendData;
    errorRate: TrendData;
    userSatisfaction: TrendData;
  };
  insights: string[];
  recommendations: string[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  direction: 'up' | 'down' | 'stable';
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    error?: string;
    metadata?: Record<string, any>;
  }>;
  overallHealth: number; // 0-100
}

export interface UsageStats {
  period: {
    start: Date;
    end: Date;
  };
  users: {
    total: number;
    active: number;
    new: number;
    returning: number;
  };
  requests: {
    total: number;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
    byStatusCode: Record<string, number>;
  };
  features: {
    codeGeneration: number;
    codeAnalysis: number;
    templates: number;
    aiAssistance: number;
  };
  geography?: Array<{
    country: string;
    requests: number;
  }>;
}

export interface BusinessMetrics {
  revenue: {
    total: number;
    recurring: number;
    oneTime: number;
    growth: number;
  };
  customers: {
    total: number;
    active: number;
    churn: number;
    retention: number;
  };
  usage: {
    apiCalls: number;
    tokenConsumption: number;
    storageUsed: number;
  };
  costs: {
    infrastructure: number;
    ai: number;
    storage: number;
    bandwidth: number;
  };
  efficiency: {
    costPerRequest: number;
    revenuePerUser: number;
    marginPercentage: number;
  };
}

export interface AnomalyDetection {
  algorithm: 'statistical' | 'machine_learning' | 'threshold';
  metric: string;
  sensitivity: 'low' | 'medium' | 'high';
  anomalies: Array<{
    timestamp: Date;
    value: number;
    expected: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface MetricsExport {
  format: 'csv' | 'json' | 'excel' | 'pdf';
  data: any[];
  metadata: {
    exportedAt: Date;
    exportedBy?: string;
    query: MetricsQuery;
    recordCount: number;
  };
}