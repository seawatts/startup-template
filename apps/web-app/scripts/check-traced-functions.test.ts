import { expect, test } from 'bun:test';
import { externalPackages } from './check-traced-functions';

test('finds the packages a chunk leaves to the runtime', () => {
  const chunk =
    'a.x("node:crypto",()=>require("node:crypto"));b.x("fs");c.y("shiki-3ef9a00b85c483d2");d.x("stripe-1a2b");d.x("stripe-1a2b");e.x("next/dist/server/x.external.js")';
  expect(externalPackages(chunk)).toEqual([
    'shiki-3ef9a00b85c483d2',
    'stripe-1a2b',
  ]);
});
