import { useCallback } from 'react';

export const useInputDetails = (element: Element | undefined) => {
  const getLabelElement = useCallback(() => {
    let labelElement = element?.querySelector('label');
    if (!labelElement && element?.parentElement) {
      labelElement = element.parentElement.querySelector('label');
    }
    return labelElement;
  }, [element]);

  const labelElement = getLabelElement();
  const labelText = labelElement?.textContent ?? '';
  const labelFor = labelElement?.getAttribute('for') ?? '';
  const inputElement = element?.querySelector('input, textarea') as
    | HTMLInputElement
    | HTMLTextAreaElement
    | undefined;

  return { inputElement, labelElement, labelFor, labelText };
};
