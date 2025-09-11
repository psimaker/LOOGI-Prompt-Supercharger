import { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { enhancementRateLimiter } from '../middleware/rateLimiter';
import { UserInputSchema } from '../models/UserInput';
import { EnhancedPromptEnhancementService } from '../services/EnhancedPromptEnhancementService';
import { ValidationError } from '../middleware/errorHandler';
import { config } from '../config/index';

const router = Router();
const enhancementService = new EnhancedPromptEnhancementService();

// Apply rate limiting to enhancement endpoint
router.use(enhancementRateLimiter);

router.post('/', validateRequest(UserInputSchema), async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Validate prompt quality - only reject on critical issues, warnings are allowed
    const validation = enhancementService.validatePrompt(req.body.prompt);
    if (!validation.isValid) {
      throw new ValidationError('Invalid prompt', validation.issues);
    }
    // Log warnings but don't reject the request
    let warnings: string[] = [];
    if (validation.warnings.length > 0) {
      warnings = validation.warnings;
      console.log(`Prompt warnings for request: ${validation.warnings.join(', ')}`);
    }

    // Enhance the prompt
    const enhancedPrompt = await enhancementService.enhancePrompt(req.body);
    
    const processingTime = Date.now() - startTime;
    
    res.status(200).json({
      ...enhancedPrompt,
      ...(warnings.length > 0 && { warnings }),
      _meta: {
        processingTime,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get enhancement suggestions without actually enhancing
router.post('/suggestions', validateRequest(UserInputSchema), async (req, res, next) => {
  try {
    const suggestions = await enhancementService.getEnhancementSuggestions(req.body);
    
    res.status(200).json({
      suggestions,
      prompt: req.body.prompt,
      mode: req.body.mode,
    });
  } catch (error) {
    next(error);
  }
});

// Validate prompt endpoint
router.post('/validate', validateRequest(UserInputSchema), async (req, res, next) => {
  try {
    const validation = enhancementService.validatePrompt(req.body.prompt);
    const suggestions = validation.isValid ? 
      await enhancementService.getEnhancementSuggestions(req.body) : 
      [];
    
    res.status(200).json({
      validation,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
});

// Get service status
router.get('/status', async (_req, res, next) => {
  try {
    const status = await enhancementService.getServiceStatus();
    
    res.status(200).json({
      service: 'enhancement',
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Only add log endpoints if logging is enabled
if (config.logging.enabled) {
  // Get AI logs for debugging
  router.get('/logs/:promptId?', async (req, res, next) => {
    try {
      const { promptId } = req.params;
      const logs = enhancementService.getLogs(promptId);
      
      res.status(200).json({
        logs,
        count: logs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  // Clear AI logs
  router.delete('/logs', async (_req, res, next) => {
    try {
      enhancementService.clearLogs();
      
      res.status(200).json({
        message: 'AI logs cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });
}

// Get deterministic prompt ID
router.post('/deterministic-id', validateRequest(UserInputSchema), async (req, res, next) => {
  try {
    const promptId = enhancementService.getDeterministicPromptId(req.body);
    
    res.status(200).json({
      promptId,
      input: req.body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get client configuration
router.get('/config', async (_req, res, next) => {
  try {
    const config = enhancementService.getClientConfig();
    
    res.status(200).json({
      config: {
        model: config.model,
        baseURL: config.baseURL,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export { router as enhanceRouter };