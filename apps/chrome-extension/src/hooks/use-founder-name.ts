import { useEffect, useState } from 'react';

export const useFounderName = () => {
  const [founderName, setFounderName] = useState('Unknown');

  useEffect(() => {
    const founderNameElement = document.querySelector('#f_founders h2');
    if (founderNameElement) {
      let name =
        founderNameElement.textContent?.split('(')[0]?.trim() ?? 'Unknown';
      name = name.replaceAll('(You)', '');
      setFounderName(name);
    }
  }, []);

  return founderName;
};
