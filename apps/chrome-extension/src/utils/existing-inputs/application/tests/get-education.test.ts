import { beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupTestDocument,
  setupTestDocument,
} from '../../tests/test-helpers';
import { getEducation } from '../get-education';
import { mockSections } from './mock-data/sections';

describe('application/getEducation', () => {
  const baseUrl = 'https://apply.ycombinator.com/application';

  beforeEach(() => {
    cleanupTestDocument();
  });

  it('should extract education entries with all fields', () => {
    setupTestDocument(mockSections.education.input);

    const results = getEducation(baseUrl);
    expect(results).toEqual(mockSections.education.output);
  });

  it('should return empty array when no education section exists', () => {
    setupTestDocument('<div></div>');
    const results = getEducation(baseUrl);
    expect(results).toEqual([]);
  });
});
