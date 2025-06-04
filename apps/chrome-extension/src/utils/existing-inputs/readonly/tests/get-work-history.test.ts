import { beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupTestDocument,
  setupTestDocument,
} from '../../tests/test-helpers';
import { getWorkHistory } from '../get-work-history';
import { mockReadOnlySections } from './mock-data/sections';

describe('readonly/getWorkHistory', () => {
  const baseUrl = 'https://apply.ycombinator.com/application';

  beforeEach(() => {
    cleanupTestDocument();
  });

  it('should extract work history entries from readonly view', () => {
    setupTestDocument(mockReadOnlySections.founderBackground.input);

    const results = getWorkHistory(baseUrl);
    const expectedWorkHistory =
      mockReadOnlySections.founderBackground.output.find(
        (o) => o.label === 'Work History',
      );
    expect(results).toContainEqual(expectedWorkHistory);
  });
});
