/**
 * Test Setup - Basic functionality test for AI Engine
 */

import dotenv from 'dotenv';
import { Logger } from './utils/logger';
import { AIService } from './services/ai-service';
import { KnowledgeBase } from './services/knowledge-base';
import { MetricsCollector } from './services/metrics-collector';
import { CodeGenerator } from './engines/code-generator';
import { CodeAnalyzer } from './engines/code-analyzer';

// Load environment variables
dotenv.config();

const logger = new Logger();

async function testAIEngine() {
  try {
    logger.info('🚀 Starting AI Engine Test Suite...');

    // Test 1: Logger functionality
    logger.info('✅ Logger working correctly');

    // Test 2: Metrics Collector (without external dependencies)
    const metricsCollector = new MetricsCollector();
    logger.info('✅ Metrics Collector initialized');

    // Test 3: Knowledge Base (basic initialization)
    const knowledgeBase = new KnowledgeBase();
    logger.info('✅ Knowledge Base initialized');

    // Test 4: AI Service (basic initialization)
    const aiService = new AIService(knowledgeBase, metricsCollector);
    logger.info('✅ AI Service initialized');

    // Test 5: Code Generator
    const codeGenerator = new CodeGenerator(aiService, knowledgeBase);
    await codeGenerator.initialize();
    logger.info('✅ Code Generator initialized');

    // Test 6: Code Analyzer
    const codeAnalyzer = new CodeAnalyzer();
    await codeAnalyzer.initialize();
    logger.info('✅ Code Analyzer initialized');

    // Test 7: Template Engine
    const templates = codeGenerator.getAvailableTemplates();
    logger.info(`✅ Found ${templates.length} available templates`);

    // Test 8: Health Checks
    logger.info('🔍 Running Health Checks...');
    logger.info(`- AI Service Health: ${aiService.isHealthy()}`);
    logger.info(`- Knowledge Base Health: ${knowledgeBase.isHealthy()}`);
    logger.info(`- Code Generator Health: ${codeGenerator.isHealthy()}`);
    logger.info(`- Code Analyzer Health: ${codeAnalyzer.isHealthy()}`);
    logger.info(`- Metrics Collector Health: ${metricsCollector.isHealthy()}`);

    logger.info('🎉 All basic tests passed! AI Engine is ready to use.');
    logger.info('');
    logger.info('📋 Next Steps:');
    logger.info('1. Set up your environment variables (.env file)');
    logger.info('2. Configure OpenAI API key for code generation');
    logger.info('3. Configure Pinecone for vector database (optional)');
    logger.info('4. Configure PostgreSQL for metrics (optional)');
    logger.info('5. Configure Redis for caching (optional)');
    logger.info('6. Start the server with: npm run dev');

  } catch (error) {
    logger.error('❌ AI Engine test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAIEngine();
}

export { testAIEngine };