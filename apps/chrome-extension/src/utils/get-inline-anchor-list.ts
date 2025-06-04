import type { PlasmoGetInlineAnchorList } from 'plasmo';

export const getInlineAnchorList: PlasmoGetInlineAnchorList = () => {
  const excludedAttributes = [
    'name="username"',
    'name="password"',
    'name="productCreds"',
    'name="productLink"',
    'name="url"',
    'name="fname"',
    'name="femail"',
    'name="gender"',
    'name="locality"',
    'name="administrativeAreaLevel1"',
    'name="linkedin"',
    'name="website"',
    'name="github"',
    'name="twitter"',
    'placeholder="USD$"',
  ];

  const notSelector = excludedAttributes
    .map((attribute) => `:not([${attribute}])`)
    .join('');

  const inputSelectors = [
    `input[type="text"]${notSelector}`,
    `input:not([type])${notSelector}`,
    `textarea${notSelector}`,
    `div.q input[type="text"]${notSelector}`,
    `div.q textarea${notSelector}`,
  ];

  const elements = document.querySelectorAll(inputSelectors.join(', '));
  return [...elements]
    .filter((element) => {
      const name = element.getAttribute('name');
      const parentId = element.parentElement?.id;
      const _parentClass = element.parentElement?.className;
      const parentRole = element.parentElement?.role;
      return (
        (!name || !/^applicants_attributes\.\d+\.emailAddress$/.test(name)) &&
        parentId !== 'School name' &&
        parentId !== 'Degree or level' &&
        parentId !== 'Field of study' &&
        parentId !== 'Company' &&
        parentId !== 'Position' &&
        parentId !== 'Description' &&
        parentRole !== 'combobox'
      );
    })
    .map((element) => ({
      element: element.parentElement || element,
      insertPosition: 'beforeend',
    }));
};
