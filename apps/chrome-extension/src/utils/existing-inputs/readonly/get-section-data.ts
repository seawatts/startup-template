export interface SectionData {
  id: string;
  name: string;
}

export function getSectionData(sectionElement: Element): SectionData {
  const sectionId = sectionElement.id;
  const sectionHeading = sectionElement.querySelector(
    String.raw`.border-gray-300.text-\[24px\].font-bold.tracking-tight`,
  );
  const sectionName = sectionHeading?.textContent?.trim() || '';

  return {
    id: sectionId,
    name: sectionName,
  };
}
