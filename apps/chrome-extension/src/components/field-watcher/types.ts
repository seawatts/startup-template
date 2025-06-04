import type { useUser } from '@clerk/chrome-extension';

import type { RouterInputs, RouterOutputs } from '@acme/api';

import type { YCGraphqlAppResponse } from '~/hooks/yc/use-yc-app';
import type { Application, Company } from '../company/context';
import type { Document } from '../document/context';

export type InputActionProps = {
  isGenerating: boolean;
  enabled: boolean;
  user: ReturnType<typeof useUser>;
  company?: Company;
  application?: Application;
  ycGraphqlResponse?: YCGraphqlAppResponse | null;
  document?: Document;
  getSignedUrl: (
    input: RouterInputs['document']['getSignedUrl'],
  ) => Promise<RouterOutputs['document']['getSignedUrl']>;
  createDocuments: (
    input: RouterInputs['document']['create'],
  ) => Promise<RouterOutputs['document']['create']>;
  createAnswer: (
    input: RouterInputs['application']['createAnswer'],
  ) => Promise<RouterOutputs['application']['createAnswer']>;
  checkDuplicate: (
    input: RouterInputs['document']['checkDuplicate'],
  ) => Promise<RouterOutputs['document']['checkDuplicate']>;
};
