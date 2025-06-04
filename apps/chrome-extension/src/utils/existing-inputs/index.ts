import { getExistingInputs as getApplicationInputs } from './application';
import { getExistingInputs as getReadonlyInputs } from './readonly';
import type { InputWithSection } from './types';

export function getExistingInputs(): InputWithSection[] {
  // Check for readonly state by looking for:
  // 1. data-q attributes
  // 2. readonly text elements
  // 3. URL pattern matching apply.ycombinator.com/apps/*
  const isReadonly =
    document.querySelector('[data-q]') !== null ||
    document.querySelector('.whitespace-pre-line.text-black') !== null ||
    globalThis.location.href.match(/apply\.ycombinator\.com\/apps\/.*/);

  if (isReadonly) {
    return getReadonlyInputs();
  }

  return getApplicationInputs();
}

export type { InputWithSection } from './types';
