import { useEffect, useState } from 'react';

/**
 * Hook to get the portal element from the Chrome extension's shadow DOM
 * @returns The portal element or null if not found
 */
export function useChromePortal() {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const shadowRoot = document.querySelector(
      'plasmo-csui#plasmo-inline-dialog-portal',
    )?.shadowRoot;
    const element = shadowRoot?.getElementById('remote-portal-content');
    setPortalElement(element ?? null);

    if (!element) {
      console.error('Could not find remote-portal-content in Shadow DOM');
    }
  }, []);

  return portalElement;
}
