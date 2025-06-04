import { getExistingInputs } from '~/utils/existing-inputs';
import type { InputActionProps } from './types';

export async function handleFormAction(
  props: InputActionProps,
  _actionType: string,
) {
  const {
    enabled,
    user,
    isGenerating,
    company,
    document,
    createAnswer,
    application,
  } = props;

  if (!enabled || !user.isSignedIn || isGenerating) {
    return;
  }

  try {
    const inputs = getExistingInputs();

    if (!company?.id || !application?.id) {
      console.error(
        `Missing company ID or application ID: ${company?.id} ${application?.id}`,
      );
      return;
    }

    const createPromises = inputs
      .filter(({ label, value }) => label && value) // Filter out empty inputs
      .map(async ({ label, value, section, url }, index) => {
        try {
          if (!application.id || !company.id) {
            return;
          }

          return await createAnswer({
            applicationId: application.id,
            companyId: company.id,
            displayOrder: index,
            documentId: document?.id,
            label,
            section,
            text: value,
            url,
          });
        } catch (error) {
          console.error(`Failed to create answer: ${label}`, error);
          return null;
        }
      });

    await Promise.all(createPromises);
  } catch (error) {
    console.error('Form submission failed:', error);
  }
}
