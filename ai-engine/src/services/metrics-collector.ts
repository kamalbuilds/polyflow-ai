/**
 * Metrics Collector Service - Performance tracking and analytics
 */

import Redis from 'redis';
import { Pool } from 'pg';
import { Logger } from '../utils/logger';
import {
  MetricsData,
  PerformanceMetrics,
  CodeGenerationMetrics,
  CodeAnalysisMetrics,
  UserMetrics,
  SystemMetrics,
  MetricsQuery,
  MetricsResponse,
  AlertConfig,
  MetricsAlert
} from '../types/metrics-types';

export class MetricsCollector {
  private logger: Logger;
  private redis: Redis.RedisClientType | null = null;
  private postgres: Pool | null = null;
  private metricsBuffer: MetricsData[] = [];
  private alerts: Map<string, AlertConfig> = new Map();
  private bufferFlushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = new Logger();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Metrics Collector...');

      // Initialize Redis for real-time metrics
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({ url: process.env.REDIS_URL });
        await this.redis.connect();
        this.logger.info('Connected to Redis for metrics caching');
      }

      // Initialize PostgreSQL for persistent metrics storage
      if (process.env.DATABASE_URL) {
        this.postgres = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });

        await this.setupMetricsTables();
        this.logger.info('Connected to PostgreSQL for metrics storage');
      }

      // Setup metric collection
      this.setupPeriodicCollection();

      // Setup alert configurations
      await this.setupAlerts();

      // Start buffer flushing
      this.startBufferFlushing();

      this.logger.info('Metrics Collector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Metrics Collector:', error);
      throw error;
    }
  }

  private async setupMetricsTables(): Promise<void> {
    if (!this.postgres) return;

    const createTables = `
      -- Code generation metrics
      CREATE TABLE IF NOT EXISTS code_generation_metrics (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) NOT NULL,
        intent TEXT,
        language VARCHAR(50),
        framework VARCHAR(50),
        token_count INTEGER,
        response_time INTEGER,
        success BOOLEAN,
        error_message TEXT,
        confidence FLOAT,
        template_used VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Code analysis metrics
      CREATE TABLE IF NOT EXISTS code_analysis_metrics (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) NOT NULL,
        language VARCHAR(50),
        code_length INTEGER,
        token_count INTEGER,
        response_time INTEGER,
        success BOOLEAN,
        error_message TEXT,
        security_issues INTEGER,
        performance_issues INTEGER,
        quality_score FLOAT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- User interaction metrics
      CREATE TABLE IF NOT EXISTS user_metrics (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        user_agent TEXT,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        status_code INTEGER,
        response_time INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- System performance metrics
      CREATE TABLE IF NOT EXISTS system_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value FLOAT NOT NULL,
        metric_unit VARCHAR(50),
        component VARCHAR(100),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Feedback metrics
      CREATE TABLE IF NOT EXISTS feedback_metrics (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        category VARCHAR(100),
        comments TEXT,
        intent TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_code_gen_timestamp ON code_generation_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_code_gen_success ON code_generation_metrics(success);
      CREATE INDEX IF NOT EXISTS idx_code_analysis_timestamp ON code_analysis_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_metrics_timestamp ON user_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
    `;

    try {
      await this.postgres.query(createTables);
      this.logger.info('Metrics tables created/verified');
    } catch (error) {
      this.logger.error('Failed to setup metrics tables:', error);
      throw error;
    }
  }

  private setupPeriodicCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(async () => {
      await this.collectSystemMetrics();
    }, 30000);

    // Collect memory and performance metrics every minute
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 60000);
  }

  private async setupAlerts(): void {
    // High error rate alert
    this.alerts.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds 5%',
      metric: 'error_rate',
      threshold: 0.05,
      comparison: 'greater_than',
      timeWindow: 300, // 5 minutes
      enabled: true,
      severity: 'warning'
    });

    // High response time alert
    this.alerts.set('high_response_time', {
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'Alert when average response time exceeds 10 seconds',
      metric: 'avg_response_time',
      threshold: 10000,
      comparison: 'greater_than',
      timeWindow: 300,
      enabled: true,
      severity: 'warning'
    });

    // Low code quality alert
    this.alerts.set('low_code_quality', {
      id: 'low_code_quality',
      name: 'Low Code Quality',
      description: 'Alert when average code quality drops below 70%',
      metric: 'avg_code_quality',
      threshold: 0.7,
      comparison: 'less_than',
      timeWindow: 600, // 10 minutes
      enabled: true,
      severity: 'info'
    });
  }

  private startBufferFlushing(): void {
    // Flush metrics buffer every 10 seconds
    this.bufferFlushInterval = setInterval(async () => {
      await this.flushMetricsBuffer();
    }, 10000);
  }

  async trackCodeGeneration(metrics: CodeGenerationMetrics): Promise<void> {
    try {
      const metricsData: MetricsData = {
        type: 'code_generation',
        timestamp: new Date(),
        data: metrics
      };

      // Add to buffer for batch processing
      this.metricsBuffer.push(metricsData);

      // Store in Redis for real-time access
      if (this.redis) {
        await this.redis.setEx(
          `metrics:code_gen:${metrics.requestId}`,
          3600, // 1 hour TTL
          JSON.stringify(metrics)
        );

        // Update real-time counters
        const key = `counters:code_gen:${new Date().toISOString().split('T')[0]}`;
        await this.redis.hIncrBy(key, 'total', 1);

        if (metrics.success) {
          await this.redis.hIncrBy(key, 'success', 1);
        } else {
          await this.redis.hIncrBy(key, 'errors', 1);
        }

        // Track response time
        await this.redis.hIncrBy(key, 'total_response_time', metrics.responseTime);
      }

      this.logger.debug('Code generation metrics tracked', {
        requestId: metrics.requestId,
        success: metrics.success,
        responseTime: metrics.responseTime
      });

    } catch (error) {
      this.logger.error('Failed to track code generation metrics:', error);
    }
  }

  async trackCodeAnalysis(metrics: CodeAnalysisMetrics): Promise<void> {
    try {
      const metricsData: MetricsData = {
        type: 'code_analysis',
        timestamp: new Date(),
        data: metrics
      };

      this.metricsBuffer.push(metricsData);

      // Store in Redis
      if (this.redis) {
        await this.redis.setEx(
          `metrics:code_analysis:${metrics.requestId}`,
          3600,
          JSON.stringify(metrics)
        );

        const key = `counters:code_analysis:${new Date().toISOString().split('T')[0]}`;
        await this.redis.hIncrBy(key, 'total', 1);

        if (metrics.success) {
          await this.redis.hIncrBy(key, 'success', 1);
        } else {
          await this.redis.hIncrBy(key, 'errors', 1);
        }
      }

      this.logger.debug('Code analysis metrics tracked', {
        requestId: metrics.requestId,
        success: metrics.success
      });

    } catch (error) {
      this.logger.error('Failed to track code analysis metrics:', error);
    }
  }

  async trackUserInteraction(metrics: UserMetrics): Promise<void> {
    try {
      const metricsData: MetricsData = {
        type: 'user_interaction',
        timestamp: new Date(),
        data: metrics
      };

      this.metricsBuffer.push(metricsData);

      // Track API usage in Redis
      if (this.redis) {
        const key = `counters:api:${new Date().toISOString().split('T')[0]}`;
        await this.redis.hIncrBy(key, 'requests', 1);
        await this.redis.hIncrBy(key, `status_${metrics.statusCode}`, 1);
        await this.redis.hIncrBy(key, 'total_response_time', metrics.responseTime);
      }

    } catch (error) {
      this.logger.error('Failed to track user metrics:', error);
    }
  }

  async trackFeedback(feedback: {
    requestId: string;
    rating: number;
    category?: string;
    comments?: string;
    intent?: string;
  }): Promise<void> {
    try {
      const metricsData: MetricsData = {
        type: 'feedback',
        timestamp: new Date(),
        data: feedback
      };

      this.metricsBuffer.push(metricsData);

      // Update feedback counters in Redis
      if (this.redis) {
        const key = `counters:feedback:${new Date().toISOString().split('T')[0]}`;
        await this.redis.hIncrBy(key, 'total', 1);
        await this.redis.hIncrBy(key, `rating_${feedback.rating}`, 1);
        await this.redis.hIncrBy(key, 'total_rating', feedback.rating);
      }

    } catch (error) {
      this.logger.error('Failed to track feedback:', error);
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        eventLoopLag: this.measureEventLoopLag()
      };

      // Store system metrics
      await this.storeSystemMetrics(metrics);

      // Check for alerts
      await this.checkAlerts(metrics);

    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      if (!this.redis) return;

      const today = new Date().toISOString().split('T')[0];

      // Get current counters
      const codeGenCounters = await this.redis.hGetAll(`counters:code_gen:${today}`);
      const analysisCounters = await this.redis.hGetAll(`counters:code_analysis:${today}`);
      const apiCounters = await this.redis.hGetAll(`counters:api:${today}`);
      const feedbackCounters = await this.redis.hGetAll(`counters:feedback:${today}`);

      // Calculate performance metrics
      const performance: PerformanceMetrics = {
        timestamp: new Date(),
        codeGenerationStats: {
          total: parseInt(codeGenCounters.total || '0'),
          successful: parseInt(codeGenCounters.success || '0'),
          failed: parseInt(codeGenCounters.errors || '0'),
          averageResponseTime: this.calculateAverage(
            parseInt(codeGenCounters.total_response_time || '0'),
            parseInt(codeGenCounters.total || '1')
          )
        },
        codeAnalysisStats: {
          total: parseInt(analysisCounters.total || '0'),
          successful: parseInt(analysisCounters.success || '0'),
          failed: parseInt(analysisCounters.errors || '0'),
          averageResponseTime: this.calculateAverage(
            parseInt(analysisCounters.total_response_time || '0'),
            parseInt(analysisCounters.total || '1')
          )
        },
        apiStats: {
          totalRequests: parseInt(apiCounters.requests || '0'),
          averageResponseTime: this.calculateAverage(
            parseInt(apiCounters.total_response_time || '0'),
            parseInt(apiCounters.requests || '1')
          ),
          errorRate: this.calculateErrorRate(apiCounters)
        },
        feedbackStats: {
          total: parseInt(feedbackCounters.total || '0'),
          averageRating: this.calculateAverage(
            parseInt(feedbackCounters.total_rating || '0'),
            parseInt(feedbackCounters.total || '1')
          )
        }
      };

      // Store performance metrics
      const metricsData: MetricsData = {
        type: 'performance',
        timestamp: new Date(),
        data: performance
      };

      this.metricsBuffer.push(metricsData);

    } catch (error) {
      this.logger.error('Failed to collect performance metrics:', error);
    }
  }

  private calculateAverage(total: number, count: number): number {
    return count > 0 ? total / count : 0;
  }

  private calculateErrorRate(counters: Record<string, string>): number {
    const totalRequests = parseInt(counters.requests || '0');
    if (totalRequests === 0) return 0;

    let errorRequests = 0;
    for (const [key, value] of Object.entries(counters)) {
      if (key.startsWith('status_') && key !== 'status_200' && key !== 'status_201' && key !== 'status_204') {
        errorRequests += parseInt(value);
      }
    }

    return errorRequests / totalRequests;
  }

  private measureEventLoopLag(): number {
    const start = process.hrtime();
    return setImmediate(() => {
      const lag = process.hrtime(start);
      return lag[0] * 1e9 + lag[1];
    }) as any;
  }

  private async storeSystemMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.postgres) return;

    const queries = [
      {
        query: 'INSERT INTO system_metrics (metric_name, metric_value, metric_unit, component) VALUES ($1, $2, $3, $4)',
        values: ['cpu_user', metrics.cpuUsage.user / 1000, 'ms', 'system']
      },
      {
        query: 'INSERT INTO system_metrics (metric_name, metric_value, metric_unit, component) VALUES ($1, $2, $3, $4)',
        values: ['cpu_system', metrics.cpuUsage.system / 1000, 'ms', 'system']
      },
      {
        query: 'INSERT INTO system_metrics (metric_name, metric_value, metric_unit, component) VALUES ($1, $2, $3, $4)',
        values: ['memory_rss', metrics.memoryUsage.rss / 1024 / 1024, 'MB', 'system']
      },
      {
        query: 'INSERT INTO system_metrics (metric_name, metric_value, metric_unit, component) VALUES ($1, $2, $3, $4)',
        values: ['memory_heap_used', metrics.memoryUsage.heapUsed / 1024 / 1024, 'MB', 'system']
      },
      {
        query: 'INSERT INTO system_metrics (metric_name, metric_value, metric_unit, component) VALUES ($1, $2, $3, $4)',
        values: ['uptime', metrics.uptime, 'seconds', 'system']
      }
    ];

    for (const { query, values } of queries) {
      try {
        await this.postgres.query(query, values);
      } catch (error) {
        this.logger.error('Failed to store system metric:', error);
      }
    }
  }

  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      let shouldAlert = false;
      let currentValue = 0;

      // Extract relevant metric value
      switch (alert.metric) {
        case 'memory_usage':
          currentValue = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
          break;
        case 'cpu_usage':
          currentValue = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000; // Convert to percentage
          break;
        default:
          continue;
      }

      // Check threshold
      switch (alert.comparison) {
        case 'greater_than':
          shouldAlert = currentValue > alert.threshold;
          break;
        case 'less_than':
          shouldAlert = currentValue < alert.threshold;
          break;
        case 'equals':
          shouldAlert = Math.abs(currentValue - alert.threshold) < 0.001;
          break;
      }

      if (shouldAlert) {
        await this.triggerAlert(alert, currentValue);
      }
    }
  }

  private async triggerAlert(alert: AlertConfig, value: number): Promise<void> {
    const alertData: MetricsAlert = {
      id: `alert_${Date.now()}`,
      alertId: alert.id,
      message: `${alert.name}: ${alert.description}. Current value: ${value}, Threshold: ${alert.threshold}`,
      severity: alert.severity,
      timestamp: new Date(),
      resolved: false,
      metadata: {
        metric: alert.metric,
        currentValue: value,
        threshold: alert.threshold
      }
    };

    this.logger.warn('Alert triggered', alertData);

    // Store alert (could also send to external alerting system)
    const metricsData: MetricsData = {
      type: 'alert',
      timestamp: new Date(),
      data: alertData
    };

    this.metricsBuffer.push(metricsData);
  }

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0 || !this.postgres) return;

    const buffer = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const client = await this.postgres.connect();

      try {
        await client.query('BEGIN');

        for (const metric of buffer) {
          await this.persistMetric(client, metric);
        }

        await client.query('COMMIT');
        this.logger.debug(`Flushed ${buffer.length} metrics to database`);

      } catch (error) {
        await client.query('ROLLBACK');
        this.logger.error('Failed to flush metrics buffer:', error);
        // Return metrics to buffer for retry
        this.metricsBuffer.unshift(...buffer);
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('Failed to connect to database for metrics flush:', error);
      this.metricsBuffer.unshift(...buffer);
    }
  }

  private async persistMetric(client: any, metric: MetricsData): Promise<void> {
    switch (metric.type) {
      case 'code_generation':
        const codeGenData = metric.data as CodeGenerationMetrics;
        await client.query(
          `INSERT INTO code_generation_metrics
           (request_id, intent, language, framework, token_count, response_time, success, error_message, confidence, template_used, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            codeGenData.requestId,
            codeGenData.intent,
            codeGenData.language,
            codeGenData.framework,
            codeGenData.tokenCount,
            codeGenData.responseTime,
            codeGenData.success,
            codeGenData.error || null,
            codeGenData.confidence || null,
            codeGenData.templateUsed || null,
            metric.timestamp
          ]
        );
        break;

      case 'code_analysis':
        const analysisData = metric.data as CodeAnalysisMetrics;
        await client.query(
          `INSERT INTO code_analysis_metrics
           (request_id, language, code_length, token_count, response_time, success, error_message, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            analysisData.requestId,
            analysisData.language,
            analysisData.codeLength,
            analysisData.tokenCount,
            analysisData.responseTime,
            analysisData.success,
            analysisData.error || null,
            metric.timestamp
          ]
        );
        break;

      case 'user_interaction':
        const userData = metric.data as UserMetrics;
        await client.query(
          `INSERT INTO user_metrics
           (session_id, user_agent, endpoint, method, status_code, response_time, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userData.sessionId,
            userData.userAgent,
            userData.endpoint,
            userData.method,
            userData.statusCode,
            userData.responseTime,
            metric.timestamp
          ]
        );
        break;

      case 'feedback':
        const feedbackData = metric.data as any;
        await client.query(
          `INSERT INTO feedback_metrics
           (request_id, rating, category, comments, intent, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            feedbackData.requestId,
            feedbackData.rating,
            feedbackData.category,
            feedbackData.comments,
            feedbackData.intent,
            metric.timestamp
          ]
        );
        break;
    }
  }

  async queryMetrics(query: MetricsQuery): Promise<MetricsResponse> {
    if (!this.postgres) {
      throw new Error('Database not available for metrics query');
    }

    try {
      let sql = '';
      let params: any[] = [];

      switch (query.metric) {
        case 'code_generation_success_rate':
          sql = `
            SELECT
              DATE_TRUNC('hour', timestamp) as time_bucket,
              COUNT(*) as total,
              COUNT(CASE WHEN success = true THEN 1 END) as successful,
              ROUND(COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
            FROM code_generation_metrics
            WHERE timestamp >= $1 AND timestamp <= $2
            GROUP BY DATE_TRUNC('hour', timestamp)
            ORDER BY time_bucket
          `;
          params = [query.startTime, query.endTime];
          break;

        case 'average_response_time':
          sql = `
            SELECT
              DATE_TRUNC('hour', timestamp) as time_bucket,
              AVG(response_time) as avg_response_time,
              MIN(response_time) as min_response_time,
              MAX(response_time) as max_response_time
            FROM code_generation_metrics
            WHERE timestamp >= $1 AND timestamp <= $2
            GROUP BY DATE_TRUNC('hour', timestamp)
            ORDER BY time_bucket
          `;
          params = [query.startTime, query.endTime];
          break;

        case 'user_satisfaction':
          sql = `
            SELECT
              DATE_TRUNC('day', timestamp) as time_bucket,
              AVG(rating) as avg_rating,
              COUNT(*) as total_feedback
            FROM feedback_metrics
            WHERE timestamp >= $1 AND timestamp <= $2
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY time_bucket
          `;
          params = [query.startTime, query.endTime];
          break;

        default:
          throw new Error(`Unknown metric: ${query.metric}`);
      }

      const result = await this.postgres.query(sql, params);

      return {
        metric: query.metric,
        startTime: query.startTime,
        endTime: query.endTime,
        data: result.rows,
        aggregation: query.aggregation || 'hour'
      };

    } catch (error) {
      this.logger.error('Failed to query metrics:', error);
      throw error;
    }
  }

  async getRealtimeMetrics(): Promise<Record<string, any>> {
    if (!this.redis) return {};

    try {
      const today = new Date().toISOString().split('T')[0];

      const [codeGen, analysis, api, feedback] = await Promise.all([
        this.redis.hGetAll(`counters:code_gen:${today}`),
        this.redis.hGetAll(`counters:code_analysis:${today}`),
        this.redis.hGetAll(`counters:api:${today}`),
        this.redis.hGetAll(`counters:feedback:${today}`)
      ]);

      return {
        codeGeneration: {
          total: parseInt(codeGen.total || '0'),
          successful: parseInt(codeGen.success || '0'),
          errors: parseInt(codeGen.errors || '0'),
          successRate: this.calculateSuccessRate(codeGen.success, codeGen.total)
        },
        codeAnalysis: {
          total: parseInt(analysis.total || '0'),
          successful: parseInt(analysis.success || '0'),
          errors: parseInt(analysis.errors || '0'),
          successRate: this.calculateSuccessRate(analysis.success, analysis.total)
        },
        api: {
          requests: parseInt(api.requests || '0'),
          averageResponseTime: this.calculateAverage(
            parseInt(api.total_response_time || '0'),
            parseInt(api.requests || '1')
          )
        },
        feedback: {
          total: parseInt(feedback.total || '0'),
          averageRating: this.calculateAverage(
            parseInt(feedback.total_rating || '0'),
            parseInt(feedback.total || '1')
          )
        }
      };

    } catch (error) {
      this.logger.error('Failed to get realtime metrics:', error);
      return {};
    }
  }

  private calculateSuccessRate(success: string | undefined, total: string | undefined): number {
    const successCount = parseInt(success || '0');
    const totalCount = parseInt(total || '0');
    return totalCount > 0 ? (successCount / totalCount) * 100 : 0;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.bufferFlushInterval) {
        clearInterval(this.bufferFlushInterval);
      }

      await this.flushMetricsBuffer();

      if (this.redis) {
        await this.redis.quit();
      }

      if (this.postgres) {
        await this.postgres.end();
      }

      this.logger.info('Metrics Collector cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup Metrics Collector:', error);
    }
  }

  isHealthy(): boolean {
    // Consider healthy if at least one storage backend is available
    return (this.redis?.isOpen) || (this.postgres !== null);
  }
}