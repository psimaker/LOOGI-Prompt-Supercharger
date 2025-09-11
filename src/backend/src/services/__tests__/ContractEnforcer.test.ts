import { describe, it, expect } from '@jest/globals';
import { ContractEnforcer, IntentRouter } from '../ContractEnforcer';
import { TaskMode } from '../OutputValidators';

// Mock the DeepseekClient
const mockDeepseekClient = {
  generateCompletion: jest.fn(),
  getModelInfo: jest.fn().mockReturnValue({ model: 'deepseek-chat' }),
  getConfig: jest.fn().mockReturnValue({
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 2000
  })
};

describe('ContractEnforcer', () => {
  let contractEnforcer: ContractEnforcer;

  beforeEach(() => {
    contractEnforcer = new ContractEnforcer(mockDeepseekClient as any);
    jest.clearAllMocks();
  });

  describe('enforceContract', () => {
    it('should return valid content immediately if contract is satisfied', async () => {
      const validContent = '```python\ndef hello():\n    print("Hello")\n```';
      const mode: TaskMode = 'code';

      const result = await contractEnforcer.enforceContract(validContent, mode, 'test prompt');

      expect(result.success).toBe(true);
      expect(result.content).toBe(validContent);
      expect(result.attempts).toBe(1);
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should attempt to fix contract violations', async () => {
      const invalidContent = 'Here is your code:\n\n```python\nprint("hello")\n```\n\nHope this helps!';
      const fixedContent = '```python\nprint("hello")\n```';
      const mode: TaskMode = 'code';

      (mockDeepseekClient.generateCompletion as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: fixedContent } }]
      });

      const result = await contractEnforcer.enforceContract(invalidContent, mode, 'test prompt');

      expect(result.success).toBe(true);
      expect(result.content).toBe(fixedContent);
      expect(result.attempts).toBe(2);
      expect(mockDeepseekClient.generateCompletion as jest.Mock).toHaveBeenCalled();
    });

    it('should respect max attempts limit', async () => {
      const invalidContent = 'Here is your code:\n\n```python\nprint("hello")\n```\n\nHope this helps!';
      const stillInvalidContent = 'Here is your fixed code:\n\n```python\nprint("hello")\n```\n\nBetter now!';
      const mode: TaskMode = 'code';

      (mockDeepseekClient.generateCompletion as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: stillInvalidContent } }]
      });

      const result = await contractEnforcer.enforceContract(invalidContent, mode, 'test prompt');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2); // maxAttempts is 2
      expect(mockDeepseekClient.generateCompletion as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should disable contract enforcement when configured', async () => {
      const strictEnforcer = new ContractEnforcer(mockDeepseekClient as any, {
        maxAttempts: 2,
        enableAutoRetry: false,
        enableContractReminder: true
      });

      const invalidContent = 'Here is your code:\n\n```python\nprint("hello")\n```\n\nHope this helps!';
      const mode: TaskMode = 'code';

      const result = await strictEnforcer.enforceContract(invalidContent, mode, 'test prompt');

      expect(result.success).toBe(false);
      expect(result.content).toBe(invalidContent);
      expect(result.attempts).toBe(1);
      expect(mockDeepseekClient.generateCompletion as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('validateContent', () => {
    it('should validate JSON content', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = contractEnforcer.validateContent(validJson, 'json');

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect JSON violations', () => {
      const invalidJson = 'Here is your JSON:\n\n{"test": true}';
      const result = contractEnforcer.validateContent(invalidJson, 'json');

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Prose or markdown detected. Only JSON allowed.');
    });
  });

  describe('getContractDescription', () => {
    it('should return contract description for code mode', () => {
      const description = contractEnforcer.getContractDescription('code');
      expect(description).toContain('exactly one code block');
      expect(description).toContain('no prose');
    });

    it('should return contract description for JSON mode', () => {
      const description = contractEnforcer.getContractDescription('json');
      expect(description).toContain('valid JSON only');
      expect(description).toContain('no prose or markdown');
    });
  });
});

describe('IntentRouter', () => {
  describe('inferTaskMode', () => {
    it('should detect code mode from keywords', () => {
      const prompt = 'Write a function to calculate fibonacci numbers';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('code');
    });

    it('should detect code mode from code blocks', () => {
      const prompt = 'Fix this code:\n```python\ndef test():\n    pass\n```';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('code');
    });

    it('should detect JSON mode from keywords', () => {
      const prompt = 'Create a JSON API response structure';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('json');
    });

    it('should detect translate mode from keywords', () => {
      const prompt = 'Translate this text to German';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('translate');
    });

    it('should detect translate mode from language indicators', () => {
      const prompt = 'Convert this to english please';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('translate');
    });

    it('should detect summarize mode from keywords', () => {
      const prompt = 'Summarize this article about climate change';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('summarize');
    });

    it('should detect analysis mode from keywords', () => {
      const prompt = 'Analyze the market trends for Q4';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('analysis');
    });

    it('should detect plan mode from keywords', () => {
      const prompt = 'Create a project plan for website development';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('plan');
    });

    it('should detect recipe mode from keywords', () => {
      const prompt = 'Give me a recipe for chocolate cake';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('recipe');
    });

    it('should detect table mode from keywords', () => {
      const prompt = 'Create a comparison table of programming languages';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('table');
    });

    it('should detect support mode from keywords', () => {
      const prompt = 'Help me fix this error in my code';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('support');
    });

    it('should detect marketing mode from keywords', () => {
      const prompt = 'Write marketing copy for our new product';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('marketing');
    });

    it('should default to write mode for general text', () => {
      const prompt = 'Write a story about a magical forest';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('write');
    });

    it('should respect explicitly specified mode', () => {
      const prompt = 'Write a story about a magical forest';
      const mode = IntentRouter.inferTaskMode(prompt, 'code');
      expect(mode).toBe('code');
    });

    it('should ignore case when detecting modes', () => {
      const prompt = 'WRITE A FUNCTION TO CALCULATE FIBONACCI';
      const mode = IntentRouter.inferTaskMode(prompt);
      expect(mode).toBe('code');
    });
  });

  describe('getRoleTemplate', () => {
    it('should return appropriate role for code mode', () => {
      const role = IntentRouter.getRoleTemplate('code');
      expect(role).toContain('Senior Software Engineer');
      expect(role).toContain('10+ years experience');
    });

    it('should return appropriate role for analysis mode', () => {
      const role = IntentRouter.getRoleTemplate('analysis');
      expect(role).toContain('Senior Business Analyst');
      expect(role).toContain('data analysis');
    });

    it('should return appropriate role for marketing mode', () => {
      const role = IntentRouter.getRoleTemplate('marketing');
      expect(role).toContain('Marketing Professional');
      expect(role).toContain('persuasive copywriting');
    });
  });

  describe('getContractRules', () => {
    it('should return appropriate rules for code mode', () => {
      const rules = IntentRouter.getContractRules('code');
      expect(rules).toContain('Provide ONLY the code block with no explanation');
      expect(rules).toContain('Use proper syntax and best practices');
      expect(rules.length).toBe(6);
    });

    it('should return appropriate rules for JSON mode', () => {
      const rules = IntentRouter.getContractRules('json');
      expect(rules).toContain('Provide ONLY valid JSON');
      expect(rules).toContain('No markdown or formatting');
      expect(rules.length).toBe(6);
    });

    it('should return appropriate rules for analysis mode', () => {
      const rules = IntentRouter.getContractRules('analysis');
      expect(rules).toContain('Start with TL;DR section');
      expect(rules).toContain('Use H2/H3 headings');
      expect(rules).toContain('Provide numbered steps');
      expect(rules.length).toBe(6);
    });

    it('should return appropriate rules for translate mode', () => {
      const rules = IntentRouter.getContractRules('translate');
      expect(rules).toContain('Provide ONLY the translation');
      expect(rules).toContain('Maintain original meaning');
      expect(rules).toContain('No explanation needed');
      expect(rules.length).toBe(6);
    });
  });
});