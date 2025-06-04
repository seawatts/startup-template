import { describe, expect, it } from 'vitest';

import { getQuestionValue } from '../get-question-value';

describe('readonly/getQuestionValue', () => {
  it('should extract read-only text value', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="whitespace-pre-line text-[16px] text-black">
        Read Only Text
      </div>
    `;
    expect(getQuestionValue(div)).toBe('Read Only Text');
  });

  it('should extract link href', () => {
    const div = document.createElement('div');
    div.innerHTML = `<a href="https://example.com">Link Text</a>`;
    expect(getQuestionValue(div)).toBe('https://example.com');
  });

  it('should handle simple text spans', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>Simple Text</span>';
    expect(getQuestionValue(div)).toBe('Simple Text');
  });

  it('should handle missing elements', () => {
    const div = document.createElement('div');
    div.innerHTML = '<div>No value elements</div>';
    expect(getQuestionValue(div)).toBe('');
  });

  it('should handle whitespace in values', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="whitespace-pre-line text-[16px] text-black">
        Text with
        multiple lines
        and spaces
      </div>
    `;
    expect(getQuestionValue(div)).toBe('Text with multiple lines and spaces');
  });
});
