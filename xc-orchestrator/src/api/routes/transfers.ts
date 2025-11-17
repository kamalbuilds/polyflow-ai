import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { XCMOrchestrator } from '../../core/XCMOrchestrator';
import { BN } from '@polkadot/util';
import { logger } from '../../utils/logger';

export function transferRoutes(orchestrator: XCMOrchestrator): Router {
  const router = Router();

  /**
   * POST /api/transfers
   * Execute XCM transfer
   */
  router.post('/',
    [
      body('sourceChain').isString().notEmpty().withMessage('Source chain is required'),
      body('destinationChain').isString().notEmpty().withMessage('Destination chain is required'),
      body('asset.symbol').isString().notEmpty().withMessage('Asset symbol is required'),
      body('asset.decimals').isInt({ min: 0, max: 18 }).withMessage('Invalid asset decimals'),
      body('amount').isString().notEmpty().withMessage('Amount is required'),
      body('sender').isString().isLength({ min: 66, max: 66 }).withMessage('Invalid sender address'),
      body('recipient').isString().isLength({ min: 66, max: 66 }).withMessage('Invalid recipient address'),
      body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const {
          sourceChain,
          destinationChain,
          asset,
          amount,
          sender,
          recipient,
          priority = 'normal'
        } = req.body;

        // Convert amount string to BN
        const amountBN = new BN(amount);
        if (amountBN.isZero() || amountBN.isNeg()) {
          return res.status(400).json({
            error: 'Invalid amount',
            message: 'Amount must be positive'
          });
        }

        const transferParams = {
          sourceChain,
          destinationChain,
          asset: {
            ...asset,
            minBalance: asset.minBalance || '1000000000',
            isNative: asset.isNative !== false // default to true if not specified
          },
          amount: amountBN,
          sender,
          recipient,
          priority
        };

        const transactionId = await orchestrator.executeTransfer(transferParams);

        res.status(201).json({
          success: true,
          transactionId,
          message: 'XCM transfer initiated successfully',
          estimatedCompletion: Date.now() + 120000 // 2 minutes estimate
        });
      } catch (error) {
        logger.error('Transfer execution failed', { error, body: req.body });
        res.status(500).json({
          error: 'Transfer failed',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  );

  /**
   * GET /api/transfers/:id
   * Get transaction status
   */
  router.get('/:id',
    [
      param('id').isUUID().withMessage('Invalid transaction ID format')
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const { id } = req.params;
        const transaction = orchestrator.getTransactionStatus(id);

        if (!transaction) {
          return res.status(404).json({
            error: 'Transaction not found',
            message: `No transaction found with ID: ${id}`
          });
        }

        res.json({
          success: true,
          transaction: {
            id: transaction.id,
            status: transaction.status,
            sourceChain: transaction.params.sourceChain,
            destinationChain: transaction.params.destinationChain,
            asset: transaction.params.asset,
            amount: transaction.params.amount.toString(),
            sender: transaction.params.sender,
            recipient: transaction.params.recipient,
            sourceBlockHash: transaction.sourceBlockHash,
            sourceBlockNumber: transaction.sourceBlockNumber,
            destinationBlockHash: transaction.destinationBlockHash,
            destinationBlockNumber: transaction.destinationBlockNumber,
            actualFee: transaction.actualFee?.toString(),
            error: transaction.error,
            retryCount: transaction.retryCount,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            completedAt: transaction.completedAt
          }
        });
      } catch (error) {
        logger.error('Error getting transaction status', { error, id: req.params.id });
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to retrieve transaction status'
        });
      }
    }
  );

  /**
   * GET /api/transfers
   * List active transactions
   */
  router.get('/',
    [
      query('status').optional().isIn(['pending', 'building', 'submitted', 'in_block', 'finalized', 'success', 'failed', 'retrying']),
      query('sourceChain').optional().isString(),
      query('destinationChain').optional().isString(),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
    ],
    (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const {
          status,
          sourceChain,
          destinationChain,
          limit = 20,
          offset = 0
        } = req.query;

        let transactions = orchestrator.getActiveTransactions();

        // Apply filters
        if (status) {
          transactions = transactions.filter(tx => tx.status === status);
        }

        if (sourceChain) {
          transactions = transactions.filter(tx => tx.params.sourceChain === sourceChain);
        }

        if (destinationChain) {
          transactions = transactions.filter(tx => tx.params.destinationChain === destinationChain);
        }

        // Apply pagination
        const total = transactions.length;
        const paginatedTransactions = transactions
          .slice(Number(offset), Number(offset) + Number(limit))
          .map(tx => ({
            id: tx.id,
            status: tx.status,
            sourceChain: tx.params.sourceChain,
            destinationChain: tx.params.destinationChain,
            asset: tx.params.asset.symbol,
            amount: tx.params.amount.toString(),
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt
          }));

        res.json({
          success: true,
          data: paginatedTransactions,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasNext: Number(offset) + Number(limit) < total
          }
        });
      } catch (error) {
        logger.error('Error listing transactions', { error, query: req.query });
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to retrieve transactions'
        });
      }
    }
  );

  /**
   * POST /api/transfers/estimate-fees
   * Estimate transfer fees
   */
  router.post('/estimate-fees',
    [
      body('sourceChain').isString().notEmpty().withMessage('Source chain is required'),
      body('destinationChain').isString().notEmpty().withMessage('Destination chain is required'),
      body('asset.symbol').isString().notEmpty().withMessage('Asset symbol is required'),
      body('asset.decimals').isInt({ min: 0, max: 18 }).withMessage('Invalid asset decimals'),
      body('amount').isString().notEmpty().withMessage('Amount is required'),
      body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority')
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const {
          sourceChain,
          destinationChain,
          asset,
          amount,
          priority = 'normal'
        } = req.body;

        const params = {
          sourceChain,
          destinationChain,
          asset: {
            ...asset,
            minBalance: asset.minBalance || '1000000000',
            isNative: asset.isNative !== false
          },
          amount: new BN(amount),
          sender: '0x' + '00'.repeat(32), // Dummy address for estimation
          recipient: '0x' + '11'.repeat(32),
          priority
        };

        const feeEstimation = await orchestrator.estimateFees(params);

        res.json({
          success: true,
          estimation: {
            baseFee: feeEstimation.baseFee.toString(),
            deliveryFee: feeEstimation.deliveryFee.toString(),
            totalFee: feeEstimation.totalFee.toString(),
            feeAsset: feeEstimation.feeAsset,
            confidence: feeEstimation.confidence,
            timestamp: feeEstimation.timestamp
          }
        });
      } catch (error) {
        logger.error('Fee estimation failed', { error, body: req.body });
        res.status(500).json({
          error: 'Fee estimation failed',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  );

  /**
   * POST /api/transfers/batch
   * Execute multiple transfers in batch
   */
  router.post('/batch',
    [
      body('transfers').isArray({ min: 1, max: 10 }).withMessage('Transfers array must contain 1-10 items'),
      body('transfers.*.sourceChain').isString().notEmpty(),
      body('transfers.*.destinationChain').isString().notEmpty(),
      body('transfers.*.asset.symbol').isString().notEmpty(),
      body('transfers.*.amount').isString().notEmpty(),
      body('transfers.*.sender').isString().isLength({ min: 66, max: 66 }),
      body('transfers.*.recipient').isString().isLength({ min: 66, max: 66 })
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const { transfers } = req.body;
        const results = [];
        const errors: any[] = [];

        for (let i = 0; i < transfers.length; i++) {
          const transfer = transfers[i];
          try {
            const transferParams = {
              ...transfer,
              amount: new BN(transfer.amount),
              asset: {
                ...transfer.asset,
                minBalance: transfer.asset.minBalance || '1000000000',
                isNative: transfer.asset.isNative !== false
              }
            };

            const transactionId = await orchestrator.executeTransfer(transferParams);
            results.push({
              index: i,
              success: true,
              transactionId
            });
          } catch (error) {
            errors.push({
              index: i,
              error: error instanceof Error ? error.message : 'Unknown error',
              transfer
            });
          }
        }

        res.status(errors.length > 0 ? 207 : 201).json({
          success: errors.length === 0,
          results,
          errors,
          summary: {
            total: transfers.length,
            successful: results.length,
            failed: errors.length
          }
        });
      } catch (error) {
        logger.error('Batch transfer failed', { error, body: req.body });
        res.status(500).json({
          error: 'Batch transfer failed',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  );

  return router;
}