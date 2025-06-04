export function getQuestionValue(questionDiv: Element): string {
  let value = '';

  // Check for textarea
  const textarea = questionDiv.querySelector('textarea');
  if (textarea instanceof HTMLTextAreaElement) {
    value = textarea.value.trim();
  }

  // Check for input
  if (!value) {
    const input = questionDiv.querySelector('input');
    if (input instanceof HTMLInputElement) {
      value = input.value.trim();
    }
  }

  // Check for select
  if (!value) {
    const select = questionDiv.querySelector('select');
    if (select instanceof HTMLSelectElement) {
      value = select.options[select.selectedIndex]?.text.trim() || '';
    }
  }

  // Check for radio buttons
  if (!value) {
    const selectedRadio =
      questionDiv.querySelector(String.raw`.border-\[5px\]`);
    if (selectedRadio) {
      const radioLabel = selectedRadio.parentElement?.querySelector('label');
      value = radioLabel?.textContent?.trim() || '';
    }
  }

  return value;
}
