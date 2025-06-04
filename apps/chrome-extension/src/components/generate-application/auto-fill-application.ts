import { getExistingInputs } from '~/utils/existing-inputs';
import { getInlineAnchorList } from '~/utils/get-inline-anchor-list';
import type { Application, Company } from '../company/context';
import type { Document } from '../document/context';
import { processAnchor } from './process-input';
import type { ProcessInfo } from './types';

interface AutoFillParams {
  founderName: string;
  company?: Company;
  application?: Application;
  document?: Document;
  userId?: string;
  setProcessInfo: React.Dispatch<React.SetStateAction<ProcessInfo>>;
}

export async function autoFillApplication({
  founderName,
  company,
  application,
  document,
  userId,
  setProcessInfo,
}: AutoFillParams) {
  setProcessInfo((previous) => ({
    ...previous,
    progress: 20,
    progressLabel: 'Analyzing application fields...',
  }));

  const anchorList = await getInlineAnchorList();
  const existingInputs = getExistingInputs();

  const totalAnchors = anchorList.length;
  let processedAnchors = 0;

  await Promise.all(
    (anchorList as { element: Element }[]).map(async (anchor, index) => {
      await processAnchor(anchor, {
        application,
        company,
        displayOrder: index,
        document,
        existingInputs,
        founderName,
        userId,
      });

      processedAnchors++;
      const progressRange = 90 - 20;
      const currentProgress =
        20 + (processedAnchors / totalAnchors) * progressRange;
      setProcessInfo((previous) => ({
        ...previous,
        progress: currentProgress,
        progressLabel: `Auto-filling fields... ${processedAnchors}/${totalAnchors}`,
      }));
    }),
  );
}
