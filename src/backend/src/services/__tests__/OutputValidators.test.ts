import { describe, it, expect } from '@jest/globals';
import {
  CodeOutputValidator,
  JsonOutputValidator,
  TextOnlyValidator,
  StructuredContentValidator,
  TableOutputValidator,
  OutputValidatorFactory
} from '../OutputValidators';

describe('OutputValidators', () => {
  describe('CodeOutputValidator', () => {
    it('should validate correct code block', () => {
      const validator = new CodeOutputValidator('python');
      const content = '```python\ndef hello():\n    print("Hello")\n```';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject code with prose', () => {
      const validator = new CodeOutputValidator();
      const content = 'Here is your code:\n\n```python\nprint("hello")\n```\n\nHope this helps!';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Prose detected before/after code block. Only code block allowed.');
    });

    it('should reject multiple code blocks', () => {
      const validator = new CodeOutputValidator();
      const content = '```python\nprint("1")\n```\n\n```python\nprint("2")\n```';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Multiple code blocks detected. Only one code block allowed.');
    });

    it('should validate language specification', () => {
      const validator = new CodeOutputValidator('javascript');
      const content = '```python\nprint("hello")\n```';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations[0]).toContain('Language mismatch');
    });

    it('should reject empty code block', () => {
      const validator = new CodeOutputValidator();
      const content = '```python\n\n```';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Code block is empty.');
    });
  });

  describe('JsonOutputValidator', () => {
    it('should validate valid JSON', () => {
      const validator = new JsonOutputValidator();
      const content = '{"name": "test", "value": 123}';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject JSON with prose', () => {
      const validator = new JsonOutputValidator();
      const content = 'Here is your JSON:\n\n{"test": true}\n\nThis should work!';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Prose or markdown detected. Only JSON allowed.');
    });

    it('should reject JSON with markdown', () => {
      const validator = new JsonOutputValidator();
      const content = '```json\n{"test": true}\n```';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Prose or markdown detected. Only JSON allowed.');
    });

    it('should reject invalid JSON', () => {
      const validator = new JsonOutputValidator();
      const content = '{"name": test, "value": 123}'; // Missing quotes around test
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Invalid JSON format.');
    });
  });

  describe('TextOnlyValidator', () => {
    it('should validate clean text', () => {
      const validator = new TextOnlyValidator();
      const content = 'This is a clean translation of the original text.';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject text with meta prefixes', () => {
      const validator = new TextOnlyValidator();
      const content = 'Translation: This is the translated text.';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Meta text or formatting detected. Only target text allowed.');
    });

    it('should reject numbered lists', () => {
      const validator = new TextOnlyValidator();
      const content = '1. First point\n2. Second point';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Meta text or formatting detected. Only target text allowed.');
    });

    it('should reject bullet points', () => {
      const validator = new TextOnlyValidator();
      const content = '- First item\n- Second item';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Meta text or formatting detected. Only target text allowed.');
    });

    it('should reject very short text', () => {
      const validator = new TextOnlyValidator();
      const content = 'Hi';
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Text too short. Provide complete translation/summary.');
    });
  });

  describe('StructuredContentValidator', () => {
    it('should validate structured content with all required elements', () => {
      const validator = new StructuredContentValidator();
      const content = `# Analysis

## TL;DR
Key findings and recommendations.

## Main Analysis
1. First important point
2. Second important point  
3. Third important point

## Conclusion
Final thoughts.`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject content without TL;DR', () => {
      const validator = new StructuredContentValidator();
      const content = `# Analysis

## Main Analysis
1. First point
2. Second point
3. Third point`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Missing TL;DR section.');
    });

    it('should reject content without numbered steps', () => {
      const validator = new StructuredContentValidator();
      const content = `# Analysis

## TL;DR
Summary here.

## Main Analysis
Just some text without numbered steps.`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Missing numbered steps (minimum 3 required).');
    });

    it('should reject content without headings', () => {
      const validator = new StructuredContentValidator();
      const content = `TL;DR: Summary here.

1. First point
2. Second point
3. Third point`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Missing H2/H3 headings (minimum 2 required).');
    });
  });

  describe('TableOutputValidator', () => {
    it('should validate proper markdown table', () => {
      const validator = new TableOutputValidator();
      const content = `| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject table without separator', () => {
      const validator = new TableOutputValidator();
      const content = `| Name | Age | City |
| John | 25  | NYC  |
| Jane | 30  | LA   |`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Invalid table format. Must be markdown table with header and separator.');
    });

    it('should reject table with meta text', () => {
      const validator = new TableOutputValidator();
      const content = `Here is your table:

| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |`;
      
      const result = validator.validate(content);
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Meta text detected. Only table allowed.');
    });
  });

  describe('OutputValidatorFactory', () => {
    it('should create correct validator for code mode', () => {
      const validator = OutputValidatorFactory.createValidator('code', 'python');
      expect(validator).toBeInstanceOf(CodeOutputValidator);
    });

    it('should create correct validator for json mode', () => {
      const validator = OutputValidatorFactory.createValidator('json');
      expect(validator).toBeInstanceOf(JsonOutputValidator);
    });

    it('should create correct validator for translate mode', () => {
      const validator = OutputValidatorFactory.createValidator('translate');
      expect(validator).toBeInstanceOf(TextOnlyValidator);
    });

    it('should create correct validator for analysis mode', () => {
      const validator = OutputValidatorFactory.createValidator('analysis');
      expect(validator).toBeInstanceOf(StructuredContentValidator);
    });

    it('should create correct validator for table mode', () => {
      const validator = OutputValidatorFactory.createValidator('table');
      expect(validator).toBeInstanceOf(TableOutputValidator);
    });

    it('should default to TextOnlyValidator for unknown modes', () => {
      const validator = OutputValidatorFactory.createValidator('unknown' as any);
      expect(validator).toBeInstanceOf(TextOnlyValidator);
    });
  });
});