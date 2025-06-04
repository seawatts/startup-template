import type { InputWithSection } from '../types';
import { getEducation } from './get-education';
import { getSectionQuestions } from './get-section-questions';
import { getWorkHistory } from './get-work-history';

export function getExistingInputs(): InputWithSection[] {
  const results: InputWithSection[] = [];
  const baseUrl = globalThis.location.href.split('#')[0];
  if (!baseUrl) {
    console.error('No base URL found', globalThis.location.href);
    return [];
  }

  // Handle sections with questions
  const sections = document.querySelectorAll("[id^='f_']");
  for (const sectionElement of sections) {
    results.push(...getSectionQuestions(sectionElement, baseUrl));
  }

  // Handle work history and education sections
  results.push(...getWorkHistory(baseUrl));
  results.push(...getEducation(baseUrl));

  return results;
}
