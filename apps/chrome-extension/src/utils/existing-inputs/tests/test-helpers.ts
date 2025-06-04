import { mockSections } from '../application/tests/mock-data';
import { mockReadOnlySections } from '../readonly/tests/mock-data';

export function setupTestDocument(html: string) {
  document.body.innerHTML = html;
}

export function setupMockSection(sectionName: keyof typeof mockSections) {
  setupTestDocument(mockSections[sectionName].input);
}

export function setupMockReadOnlySection(
  sectionName: keyof typeof mockReadOnlySections,
) {
  setupTestDocument(mockReadOnlySections[sectionName].input);
}

export function cleanupTestDocument() {
  document.body.innerHTML = '';
}

export function createTestElement(innerHTML: string): Element {
  const div = document.createElement('div');
  div.innerHTML = innerHTML;
  return div.firstElementChild || div;
}
