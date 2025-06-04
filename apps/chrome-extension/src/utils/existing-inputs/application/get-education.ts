import type { InputWithSection } from '../types';

export function getEducation(baseUrl: string): InputWithSection[] {
  const results: InputWithSection[] = [];
  const educationSection = document.querySelector('#degrees');

  if (educationSection) {
    const eduEntries = educationSection.querySelectorAll(
      '.flex.w-full.flex-col > div',
    );
    for (const entry of eduEntries) {
      const school = entry.querySelector('.font-bold')?.textContent?.trim();
      const date =
        entry
          .querySelector('.text-md.hidden.grow.text-nowrap.text-right')
          ?.textContent?.trim() ||
        entry
          .querySelector('.visible.text-sm.font-medium.text-stone-500')
          ?.textContent?.trim();
      const degree = entry
        .querySelector(".font-bold + div:not([class*='text'])")
        ?.textContent?.trim();

      if (school && date) {
        const value = degree
          ? `${school}, ${degree} (${date})`
          : `${school} (${date})`;

        results.push({
          label: 'Education',
          section: 'Background',
          url: `${baseUrl}#f_background`,
          value,
        });
      }
    }
  }

  return results;
}
