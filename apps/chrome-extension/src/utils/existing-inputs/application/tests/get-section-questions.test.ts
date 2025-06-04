import { describe, expect, it } from 'vitest';

import { createTestElement } from '../../tests/test-helpers';
import { getSectionQuestions } from '../get-section-questions';
import { mockSections } from './mock-data/sections';

describe('application/getSectionQuestions', () => {
  const baseUrl = 'https://apply.ycombinator.com/application';

  it('should extract questions from a section', () => {
    const section = createTestElement(mockSections.company.input);

    const results = getSectionQuestions(section, baseUrl);
    expect(results).toEqual(mockSections.company.output);
  });

  it('should handle multiple questions in a section', () => {
    const section = createTestElement(mockSections.idea.input);

    const results = getSectionQuestions(section, baseUrl);
    expect(results).toEqual(mockSections.idea.output);
  });
});
