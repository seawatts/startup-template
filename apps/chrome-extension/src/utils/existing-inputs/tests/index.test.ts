import { beforeEach, describe, expect, it } from 'vitest';

import { mockSections } from '../application/tests/mock-data';
import { getExistingInputs } from '../index';
import { mockReadOnlySections } from '../readonly/tests/mock-data';
import { cleanupTestDocument, setupTestDocument } from './test-helpers';

describe('getExistingInputs', () => {
  beforeEach(() => {
    cleanupTestDocument();
    Object.defineProperty(globalThis, 'location', {
      value: { href: 'https://apply.ycombinator.com/application' },
      writable: true,
    });
  });

  describe('state detection', () => {
    it('should detect application state when no data-q attributes are present', () => {
      setupTestDocument(mockSections.company.input);
      const results = getExistingInputs();
      expect(results).toEqual(mockSections.company.output);
    });

    it('should detect readonly state when data-q attributes are present', () => {
      setupTestDocument(mockReadOnlySections.founderBackground.input);
      const results = getExistingInputs();
      expect(results).toEqual(mockReadOnlySections.founderBackground.output);
    });
  });

  describe('url handling', () => {
    it('should handle application urls correctly', () => {
      setupTestDocument(mockSections.company.input);
      const results = getExistingInputs();
      expect(results[0]?.url).toBe(
        'https://apply.ycombinator.com/application#name',
      );
    });

    it('should handle founder profile urls correctly', () => {
      Object.defineProperty(globalThis, 'location', {
        value: { href: 'https://apply.ycombinator.com/bio/edit' },
        writable: true,
      });
      setupTestDocument(mockReadOnlySections.founderBackground.input);
      const results = getExistingInputs();
      expect(results[0]?.url).toContain(
        'https://apply.ycombinator.com/bio/edit#',
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing sections gracefully', () => {
      setupTestDocument('<div></div>');
      const results = getExistingInputs();
      expect(results).toEqual([]);
    });

    it('should handle empty sections gracefully', () => {
      setupTestDocument(`
        <div id="f_company">
          <div class="border-gray-300 text-[24px] font-bold">Company</div>
        </div>
      `);
      const results = getExistingInputs();
      expect(results).toEqual([]);
    });
  });
});
