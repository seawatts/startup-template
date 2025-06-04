import type { InputWithSection } from '../types';
import { getQuestionValue } from './get-question-value';
import { getSectionData } from './get-section-data';

export function getSectionQuestions(
  sectionElement: Element,
  baseUrl: string,
): InputWithSection[] {
  const results: InputWithSection[] = [];
  const { id: sectionId, name: sectionName } = getSectionData(sectionElement);

  // Find all question divs within this section
  const questionDivs = sectionElement.querySelectorAll('.q');

  for (const questionDiv of questionDivs) {
    const labelElement = questionDiv.querySelector('label span');
    const label = labelElement?.textContent?.trim() || '';
    const value = getQuestionValue(questionDiv);
    const questionId = questionDiv.id;

    if (label && value && questionId) {
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
