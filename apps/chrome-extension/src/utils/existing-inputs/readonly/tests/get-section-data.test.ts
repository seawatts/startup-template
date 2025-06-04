import { describe, expect, it } from 'vitest';

import { getSectionData } from '../get-section-data';

describe('readonly/getSectionData', () => {
  it('should extract section id and name from readonly view', () => {
    const section = document.createElement('div');
    section.id = 'f_company';
    section.innerHTML = `
      <div class="border-gray-300 text-[24px] font-bold tracking-tight">Company</div>
    `;

    const result = getSectionData(section);
    expect(result).toEqual({
      id: 'f_company',
      name: 'Company',
    });
  });

  it('should handle missing section name in readonly view', () => {
    const section = document.createElement('div');
    section.id = 'f_test';

    const result = getSectionData(section);
    expect(result).toEqual({
      id: 'f_test',
      name: '',
    });
  });

  it('should handle multiple heading elements in readonly view', () => {
    const section = document.createElement('div');
    section.id = 'f_test';
    section.innerHTML = `
      <div class="border-gray-300 text-[24px] font-bold tracking-tight">First</div>
      <div class="border-gray-300 text-[24px] font-bold tracking-tight">Second</div>
    `;

    const result = getSectionData(section);
    expect(result).toEqual({
      id: 'f_test',
      name: 'First',
    });
  });
});
