import type { useUser } from '@clerk/chrome-extension';
import { toast } from '@seawatts/ui/sonner';

import type { Application, Company } from '../company/context';
import type { Document } from '../document/context';
import { autoFillApplication } from './auto-fill-application';
import type { ProcessInfo } from './types';

interface HandleSubmitProps {
  user: ReturnType<typeof useUser>;
  company?: Company;
  application?: Application;
  document?: Document;
  founderName: string;
  setProcessInfo: React.Dispatch<React.SetStateAction<ProcessInfo>>;
}

export async function handleSubmit({
  user,
  company,
  application,
  document,
  founderName,
  setProcessInfo,
}: HandleSubmitProps) {
  setProcessInfo((previous) => ({
    ...previous,
    isGenerating: true,
    progress: 0,
    progressLabel: 'Preparing to process...',
  }));

  try {
    await autoFillApplication({
      application,
      company,
      document,
      founderName,
      setProcessInfo,
      userId: user.user?.id,
    });

    setProcessInfo((previous) => ({
      ...previous,
      progress: 100,
      progressLabel: 'Application generated successfully',
    }));
    toast.success('Application generated successfully');
  } catch (error) {
    console.error('Error generating application:', error);
    toast.error('Failed to generate application');
  } finally {
    setProcessInfo((previous) => ({ ...previous, isGenerating: false }));
  }
}
