import cssText from 'data-text:~/style.css';
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: [
    'https://apply.ycombinator.com/*',
    'https://apply.ycombinator.com/app/edit/*',
    'https://apply.ycombinator.com/bio/edit/*',
    'https://apply.ycombinator.com/app/edit?*',
  ],
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText.replaceAll(':root', ':host(plasmo-csui)');
  return style;
};

export const getInlineAnchor: PlasmoGetInlineAnchor = () => ({
  element: document.querySelector('body') as Element,
  insertPosition: 'beforeend',
});

export const getShadowHostId = () => 'plasmo-inline-dialog-portal';

const Content = () => {
  return <div id="remote-portal-content" />;
};

export default Content;
