import { beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupTestDocument,
  setupTestDocument,
} from '../../tests/test-helpers';
import { getWorkHistory } from '../get-work-history';
import { mockSections } from './mock-data/sections';

describe('application/getWorkHistory', () => {
  const baseUrl = 'https://apply.ycombinator.com/application';

  beforeEach(() => {
    cleanupTestDocument();
  });

  it('should extract work history entries with all fields', () => {
    setupTestDocument(mockSections.workHistory.input);

    const results = getWorkHistory(baseUrl);
    expect(results).toEqual(mockSections.workHistory.output);
  });
});
