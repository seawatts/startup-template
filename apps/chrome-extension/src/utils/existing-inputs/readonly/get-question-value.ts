export function getQuestionValue(questionDiv: Element): string {
  let value = '';

  // Check for read-only text
  const readOnlyValue = questionDiv.querySelector(
    'div.whitespace-pre-line.text-black',
  );
  if (readOnlyValue) {
    value = readOnlyValue.textContent?.trim() || '';
  }

  // Handle links
  if (!value) {
    const linkElement = questionDiv.querySelector('a');
    if (linkElement) {
      value = linkElement.href.replace(/\/$/, '');
    }
  }

  // Handle simple text spans
  if (!value) {
    const span = questionDiv.querySelector('span:not(.font-bold)');
    if (span) {
      value = span.textContent?.trim() || '';
    }
  }

  // Normalize whitespace
  return value.replaceAll(/\s+/g, ' ').trim();
}
