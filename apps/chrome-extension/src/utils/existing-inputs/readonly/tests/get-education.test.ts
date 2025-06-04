import { beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupTestDocument,
  setupTestDocument,
} from '../../tests/test-helpers';
import { getEducation } from '../get-education';
import { mockReadOnlySections } from './mock-data/sections';

describe('readonly/getEducation', () => {
  const baseUrl = 'https://apply.ycombinator.com/application';

  beforeEach(() => {
    cleanupTestDocument();
  });

  it('should extract education entries from readonly view', () => {
    setupTestDocument(mockReadOnlySections.founderBackground.input);

    const results = getEducation(baseUrl);
    const expectedEducation =
      mockReadOnlySections.founderBackground.output.find(
        (o) => o.label === 'Education',
      );
    expect(results).toContainEqual(expectedEducation);
  });
});
