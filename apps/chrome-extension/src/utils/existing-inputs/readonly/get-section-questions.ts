import type { InputWithSection } from '../types';
import { getQuestionValue } from './get-question-value';
import { getSectionData } from './get-section-data';

export function getSectionQuestions(
  sectionElement: Element,
  baseUrl: string,
): InputWithSection[] {
  const results: InputWithSection[] = [];
  const { name: sectionName } = getSectionData(sectionElement);

  // Find all question divs with data-q attributes
  const questionDivs = sectionElement.querySelectorAll('[data-q]');

  for (const questionDiv of questionDivs) {
    // Use a simpler selector that JSDOM can handle
    const labelElement = questionDiv.querySelector('div.font-bold');
    const label =
      labelElement?.textContent?.trim() ||
      // eslint-disable-next-line unicorn/prefer-dom-node-dataset
      questionDiv.getAttribute('data-q') ||
      '';
    const value = getQuestionValue(questionDiv);
    const questionId =
      questionDiv.id || label.toLowerCase().replaceAll(/[^a-z0-9]/g, '');

    if (label && value) {
      results.push({
        label,
        section: sectionName,
        url: `${baseUrl}#${questionId}`,
        value,
      });
    }
  }

  return results;
}
