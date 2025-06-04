import { describe, expect, it } from 'vitest';

import { getQuestionValue } from '../get-question-value';

describe('application/getQuestionValue', () => {
  it('should extract textarea value', () => {
    const div = document.createElement('div');
    div.innerHTML = '<textarea>Test Answer</textarea>';
    expect(getQuestionValue(div)).toBe('Test Answer');
  });

  it('should extract input value', () => {
    const div = document.createElement('div');
    div.innerHTML = `<input type="text" value="Test Input" />`;
    expect(getQuestionValue(div)).toBe('Test Input');
  });

  it('should extract selected option from select', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <select>
        <option>Option 1</option>
        <option selected>Selected Option</option>
      </select>
    `;
    expect(getQuestionValue(div)).toBe('Selected Option');
  });

  it('should extract radio button value', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div>
        <div class="border-[5px]"></div>
        <label>Yes</label>
      </div>
    `;
    expect(getQuestionValue(div)).toBe('Yes');
  });

  it('should handle empty values', () => {
    const div = document.createElement('div');
    div.innerHTML = `<input type="text" value="" />`;
    expect(getQuestionValue(div)).toBe('');
  });

  it('should handle missing elements', () => {
    const div = document.createElement('div');
    div.innerHTML = '<div>No input elements</div>';
    expect(getQuestionValue(div)).toBe('');
  });
});
