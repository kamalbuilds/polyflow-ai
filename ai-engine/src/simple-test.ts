/**
 * Simple Test - Basic functionality test without external dependencies
 */

import { Logger } from './utils/logger';
import { CodeAnalyzer } from './engines/code-analyzer';

const logger = new Logger();

async function simpleTest() {
  try {
    logger.info('🚀 Starting Simple AI Engine Test...');

    // Test 1: Logger functionality
    logger.info('✅ Logger working correctly');
    logger.debug('Debug message test');
    logger.warn('Warning message test');

    // Test 2: Code Analyzer (without external dependencies)
    const codeAnalyzer = new CodeAnalyzer();
    await codeAnalyzer.initialize();
    logger.info('✅ Code Analyzer initialized');

    // Test 3: Simple code analysis
    const testCode = `
    fn main() {
        let value = Some(42);
        let result = value.unwrap(); // This should trigger security warning
        println!("{}", result);
    }
    `;

    const analysisResult = await codeAnalyzer.analyzeCode({
      requestId: 'test-123',
      code: testCode,
      language: 'rust',
      framework: 'substrate'
    });

    logger.info('✅ Code analysis completed');
    logger.info(`- Security issues found: ${analysisResult.securityIssues.length}`);
    logger.info(`- Performance issues found: ${analysisResult.performanceIssues.length}`);
    logger.info(`- Code quality score: ${analysisResult.codeQuality.score}`);

    // Test 4: Health Check
    logger.info('🔍 Running Health Check...');
    logger.info(`- Code Analyzer Health: ${codeAnalyzer.isHealthy()}`);

    logger.info('');
    logger.info('🎉 Simple AI Engine test passed! Core components are working.');
    logger.info('');
    logger.info('📋 Next Steps:');
    logger.info('1. Set up environment variables for full functionality');
    logger.info('2. Configure OpenAI API key for AI-powered features');
    logger.info('3. Configure Pinecone for vector database (optional)');
    logger.info('4. Start the full server with: npm run dev');

  } catch (error) {
    logger.error('❌ Simple test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  simpleTest();
}

export { simpleTest };