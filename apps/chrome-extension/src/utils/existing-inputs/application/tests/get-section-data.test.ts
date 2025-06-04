import { describe, expect, it } from 'vitest';

import { getSectionData } from '../get-section-data';

describe('application/getSectionData', () => {
  it('should extract section id and name', () => {
    const section = document.createElement('div');
    section.id = 'f_company';
    section.innerHTML = `
      <div class="border-gray-300 text-[24px] font-bold">Company</div>
    `;

    const result = getSectionData(section);
    expect(result).toEqual({
      id: 'f_company',
      name: 'Company',
    });
  });

  it('should handle missing section name', () => {
    const section = document.createElement('div');
    section.id = 'f_test';

    const result = getSectionData(section);
    expect(result).toEqual({
      id: 'f_test',
      name: '',
    });
  });

  it('should handle section with no id', () => {
    const section = document.createElement('div');
    section.innerHTML = `
      <div class="border-gray-300 text-[24px] font-bold">Test</div>
    `;

    const result = getSectionData(section);
    expect(result).toEqual({
      id: '',
      name: 'Test',
    });
  });
});
