import type { InputWithSection } from '../types';

export function getWorkHistory(baseUrl: string): InputWithSection[] {
  const results: InputWithSection[] = [];
  const workHistorySection = document.querySelector('#experiences');

  if (workHistorySection) {
    const workEntries = workHistorySection.querySelectorAll(
      '.flex.w-full.flex-col > div',
    );
    for (const entry of workEntries) {
      const title = entry.querySelector('.font-bold')?.textContent?.trim();
      const date =
        entry
          .querySelector('.text-md.hidden.grow.text-nowrap.text-right')
          ?.textContent?.trim() ||
        entry
          .querySelector('.visible.text-sm.font-medium.text-stone-500')
          ?.textContent?.trim();
      const description = entry
        .querySelector(String.raw`.text-md\!mb-0\!text-\[\#555\]`)
        ?.textContent?.trim();

      if (title) {
        results.push({
          label: 'Work History',
          section: 'Background',
          url: `${baseUrl}#f_background`,
          value: `${title}${date ? ` (${date})` : ''}${
            description ? `\n${description}` : ''
          }`,
        });
      }
    }
  }

  return results;
}
