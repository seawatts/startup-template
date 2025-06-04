export function getLabelText(
  element: Element,
  inputElement: HTMLInputElement | HTMLTextAreaElement,
): string {
  let labelText = '';
  let currentElement: Element | null = element;

  while (currentElement && !labelText) {
    // Check for label element
    const labelElement = currentElement.querySelector('label');
    if (labelElement) {
      labelText = labelElement.textContent?.trim() || '';
    }

    // Check for aria-label
    if (!labelText) {
      const ariaLabel = currentElement.getAttribute('aria-label');
      if (ariaLabel) {
        labelText = ariaLabel;
      }
    }

    // Check for placeholder
    if (!labelText) {
      const placeholder = inputElement.getAttribute('placeholder');
      if (placeholder) {
        labelText = placeholder;
      }
    }

    currentElement = currentElement.parentElement;
  }

  // If still no label text, check for name or id
  if (!labelText) {
    labelText = inputElement.name || inputElement.id || '';
  }

  if (!labelText) {
    console.warn('No label text found for input:', inputElement);
  }

  return labelText;
}
