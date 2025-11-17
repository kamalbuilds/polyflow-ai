import axios from 'axios';
import { NotificationConfig, ChainEvent, XCMTransaction } from '../types';
import { logger } from '../utils/logger';

interface NotificationPayload {
  type: 'event' | 'transaction' | 'alert';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class NotificationService {
  private config: NotificationConfig;
  private rateLimiter = new Map<string, number>();
  private rateLimitWindow = 60000; // 1 minute
  private maxNotificationsPerWindow = 10;

  constructor(config?: NotificationConfig) {
    this.config = config || {};
  }

  /**
   * Update notification configuration
   */
  updateConfig(config: NotificationConfig): void {
    this.config = { ...this.config, ...config };
    logger.info('Notification configuration updated', { config: this.config });
  }

  /**
   * Send notification for chain event
   */
  async notifyEvent(event: ChainEvent): Promise<void> {
    const priority = this.determineEventPriority(event);

    if (priority === 'low' && !this.shouldNotifyLowPriority()) {
      return; // Skip low priority notifications if rate limited
    }

    const payload: NotificationPayload = {
      type: 'event',
      title: `${event.section}.${event.method} - ${event.chainId}`,
      message: this.formatEventMessage(event),
      data: event,
      timestamp: event.timestamp,
      priority
    };

    await this.sendNotifications(payload);
  }

  /**
   * Send notification for transaction update
   */
  async notifyTransaction(transaction: XCMTransaction, message?: string): Promise<void> {
    const priority = this.determineTransactionPriority(transaction);

    const payload: NotificationPayload = {
      type: 'transaction',
      title: `XCM Transaction ${transaction.status}`,
      message: message || this.formatTransactionMessage(transaction),
      data: transaction,
      timestamp: new Date(),
      priority
    };

    await this.sendNotifications(payload);
  }

  /**
   * Send alert notification
   */
  async sendAlert(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    data?: any
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'alert',
      title,
      message,
      data,
      timestamp: new Date(),
      priority
    };

    await this.sendNotifications(payload);
  }

  /**
   * Send notifications to all configured channels
   */
  private async sendNotifications(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    // Check rate limiting
    if (!this.checkRateLimit(payload.type)) {
      logger.debug('Notification rate limited', { type: payload.type });
      return;
    }

    // Send to webhook
    if (this.config.webhook) {
      promises.push(this.sendWebhook(payload));
    }

    // Send to Discord
    if (this.config.discord) {
      promises.push(this.sendDiscord(payload));
    }

    // Send to Slack
    if (this.config.slack) {
      promises.push(this.sendSlack(payload));
    }

    // Send to Telegram
    if (this.config.telegram) {
      promises.push(this.sendTelegram(payload));
    }

    // Send email (placeholder)
    if (this.config.email) {
      promises.push(this.sendEmail(payload));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error sending notifications', { error, payload });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    if (!this.config.webhook) return;

    try {
      await axios.post(this.config.webhook, {
        ...payload,
        source: 'XCM-Orchestrator'
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'XCM-Orchestrator/1.0'
        }
      });

      logger.debug('Webhook notification sent', { url: this.config.webhook });
    } catch (error) {
      logger.error('Failed to send webhook notification', { error, url: this.config.webhook });
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    if (!this.config.discord) return;

    try {
      const embed = {
        title: payload.title,
        description: payload.message,
        color: this.getColorForPriority(payload.priority),
        timestamp: payload.timestamp.toISOString(),
        footer: {
          text: 'XCM Orchestrator'
        },
        fields: []
      };

      // Add specific fields based on payload type
      if (payload.type === 'event' && payload.data) {
        const event = payload.data as ChainEvent;
        embed.fields.push(
          { name: 'Chain', value: event.chainId, inline: true },
          { name: 'Block', value: event.blockNumber?.toString() || 'N/A', inline: true },
          { name: 'Section.Method', value: `${event.section}.${event.method}`, inline: true }
        );
      }

      if (payload.type === 'transaction' && payload.data) {
        const tx = payload.data as XCMTransaction;
        embed.fields.push(
          { name: 'Transaction ID', value: tx.id, inline: false },
          { name: 'Route', value: `${tx.params.sourceChain} → ${tx.params.destinationChain}`, inline: true },
          { name: 'Asset', value: tx.params.asset.symbol, inline: true },
          { name: 'Status', value: tx.status, inline: true }
        );
      }

      await axios.post(this.config.discord, {
        embeds: [embed]
      }, {
        timeout: 5000
      });

      logger.debug('Discord notification sent');
    } catch (error) {
      logger.error('Failed to send Discord notification', { error });
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(payload: NotificationPayload): Promise<void> {
    if (!this.config.slack) return;

    try {
      const slackPayload = {
        text: payload.title,
        attachments: [
          {
            color: this.getColorForPriority(payload.priority),
            fields: [
              {
                title: 'Message',
                value: payload.message,
                short: false
              },
              {
                title: 'Type',
                value: payload.type,
                short: true
              },
              {
                title: 'Priority',
                value: payload.priority,
                short: true
              }
            ],
            ts: Math.floor(payload.timestamp.getTime() / 1000)
          }
        ]
      };

      await axios.post(this.config.slack, slackPayload, {
        timeout: 5000
      });

      logger.debug('Slack notification sent');
    } catch (error) {
      logger.error('Failed to send Slack notification', { error });
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegram(payload: NotificationPayload): Promise<void> {
    if (!this.config.telegram) return;

    try {
      // Parse telegram config: bot_token:chat_id
      const [botToken, chatId] = this.config.telegram.split(':');

      const message = `*${payload.title}*\n\n${payload.message}\n\n` +
        `Type: ${payload.type}\n` +
        `Priority: ${payload.priority}\n` +
        `Time: ${payload.timestamp.toISOString()}`;

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }, {
        timeout: 5000
      });

      logger.debug('Telegram notification sent');
    } catch (error) {
      logger.error('Failed to send Telegram notification', { error });
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    if (!this.config.email) return;

    // This would integrate with an email service like SendGrid, AWS SES, etc.
    logger.debug('Email notification would be sent', {
      to: this.config.email,
      subject: payload.title
    });
  }

  /**
   * Determine event priority
   */
  private determineEventPriority(event: ChainEvent): 'low' | 'medium' | 'high' | 'critical' {
    // XCM failures are high priority
    if (event.section.includes('xcm') || event.section.includes('Xcm')) {
      if (event.method === 'Fail' || event.method === 'Error') {
        return 'high';
      }
      if (event.method === 'Success' || event.method === 'Complete') {
        return 'medium';
      }
      if (event.method === 'AssetsTrapped') {
        return 'critical';
      }
    }

    // Balance transfers are low priority
    if (event.section === 'balances' && event.method === 'Transfer') {
      return 'low';
    }

    return 'low';
  }

  /**
   * Determine transaction priority
   */
  private determineTransactionPriority(transaction: XCMTransaction): 'low' | 'medium' | 'high' | 'critical' {
    switch (transaction.status) {
      case 'failed':
        return 'high';
      case 'success':
        return 'medium';
      case 'retrying':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Format event message
   */
  private formatEventMessage(event: ChainEvent): string {
    let message = `Event: ${event.section}.${event.method} on ${event.chainId}`;

    if (event.blockNumber) {
      message += `\nBlock: ${event.blockNumber}`;
    }

    if (event.data && Array.isArray(event.data) && event.data.length > 0) {
      message += `\nData: ${JSON.stringify(event.data, null, 2)}`;
    }

    return message;
  }

  /**
   * Format transaction message
   */
  private formatTransactionMessage(transaction: XCMTransaction): string {
    let message = `Transaction: ${transaction.id}\n`;
    message += `Status: ${transaction.status}\n`;
    message += `Route: ${transaction.params.sourceChain} → ${transaction.params.destinationChain}\n`;
    message += `Asset: ${transaction.params.asset.symbol}\n`;
    message += `Amount: ${transaction.params.amount.toString()}`;

    if (transaction.error) {
      message += `\nError: ${transaction.error}`;
    }

    if (transaction.retryCount > 0) {
      message += `\nRetry Count: ${transaction.retryCount}`;
    }

    return message;
  }

  /**
   * Get color for priority level
   */
  private getColorForPriority(priority: string): number {
    switch (priority) {
      case 'critical': return 0xFF0000; // Red
      case 'high': return 0xFF8C00; // Orange
      case 'medium': return 0xFFD700; // Gold
      case 'low': return 0x00FF00; // Green
      default: return 0x808080; // Gray
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(type: string): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;

    // Clean up old entries
    const count = this.rateLimiter.get(type) || 0;

    if (count >= this.maxNotificationsPerWindow) {
      return false;
    }

    this.rateLimiter.set(type, count + 1);

    // Schedule cleanup
    setTimeout(() => {
      const currentCount = this.rateLimiter.get(type) || 0;
      if (currentCount > 0) {
        this.rateLimiter.set(type, currentCount - 1);
      }
    }, this.rateLimitWindow);

    return true;
  }

  /**
   * Check if we should notify low priority events
   */
  private shouldNotifyLowPriority(): boolean {
    // Only allow low priority notifications occasionally
    return Math.random() < 0.1; // 10% chance
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    rateLimitStatus: Record<string, number>;
    configuredChannels: string[];
    rateLimitWindow: number;
    maxPerWindow: number;
  } {
    return {
      rateLimitStatus: Object.fromEntries(this.rateLimiter.entries()),
      configuredChannels: Object.keys(this.config).filter(key => this.config[key as keyof NotificationConfig]),
      rateLimitWindow: this.rateLimitWindow,
      maxPerWindow: this.maxNotificationsPerWindow
    };
  }

  /**
   * Test all configured notification channels
   */
  async testNotifications(): Promise<Record<string, boolean>> {
    const testPayload: NotificationPayload = {
      type: 'alert',
      title: 'XCM Orchestrator Test Notification',
      message: 'This is a test notification to verify that all channels are working correctly.',
      timestamp: new Date(),
      priority: 'low'
    };

    const results: Record<string, boolean> = {};

    if (this.config.webhook) {
      try {
        await this.sendWebhook(testPayload);
        results.webhook = true;
      } catch {
        results.webhook = false;
      }
    }

    if (this.config.discord) {
      try {
        await this.sendDiscord(testPayload);
        results.discord = true;
      } catch {
        results.discord = false;
      }
    }

    if (this.config.slack) {
      try {
        await this.sendSlack(testPayload);
        results.slack = true;
      } catch {
        results.slack = false;
      }
    }

    if (this.config.telegram) {
      try {
        await this.sendTelegram(testPayload);
        results.telegram = true;
      } catch {
        results.telegram = false;
      }
    }

    return results;
  }
}