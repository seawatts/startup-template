import { useFormGeneration } from '~/stores/form-generation';
import { fetchAndStream } from '~/utils/fetch-stream';
import { getLabelText } from '~/utils/get-label-text';
import type { Application, Company } from '../company/context';
import type { Document } from '../document/context';

interface ProcessAnchorOptions {
  founderName: string;
  company?: Company;
  document?: Document;
  existingInputs: unknown;
  userId?: string;
  application?: Application;
  displayOrder: number;
}

export async function processAnchor(
  anchor: { element: Element },
  props: ProcessAnchorOptions,
) {
  const {
    founderName,
    company,
    application,
    document,
    existingInputs,
    userId,
    displayOrder,
  } = props;
  const setIsGenerating = useFormGeneration.getState().setIsGenerating;

  try {
    setIsGenerating(true);

    const element = anchor.element;
    const inputElement = element.querySelector('input, textarea') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (inputElement && !inputElement.value.trim()) {
      const labelText = getLabelText(element, inputElement);

      if (labelText === '$') {
        console.warn("Skipping input with '$' label", {
          element,
          inputElement,
          labelText,
        });
        return;
      }

      try {
        await fetchAndStream<
          | {
              response: string;
              characterCount: number;
            }
          | undefined
        >(
          '/api/generate-application',
          {
            applicationId: application?.id,
            company: JSON.stringify(company),
            companyId: company?.id,
            displayOrder,
            documentId: document?.id,
            existingInputs: existingInputs,
            prompt: labelText,
            userId: userId,
            userName: founderName,
          },
          (partialData) => {
            if (partialData?.response) {
              const trimmedResponse = partialData.response.trim();
              inputElement.value = trimmedResponse;
              inputElement.setAttribute('value', trimmedResponse);

              // Force input to register change
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
              inputElement.dispatchEvent(
                new Event('change', { bubbles: true }),
              );

              // Dispatch custom event last
              inputElement.dispatchEvent(
                new CustomEvent('form-generation-input', {
                  bubbles: true,
                  detail: { value: trimmedResponse },
                }),
              );
            }
          },
        );
      } catch (error) {
        console.error('Error generating application:', error);
        throw error;
      }
    }
  } finally {
    setIsGenerating(false);
  }
}
