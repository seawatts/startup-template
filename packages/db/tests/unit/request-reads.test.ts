import { describe, expect, it } from 'bun:test';
import { requestRead, sharingRequestReads } from '../../src/request-reads';

describe('requestRead', () => {
  it('reads every time outside a sharing request', async () => {
    let reads = 0;
    const load = async () => ++reads;
    expect(await requestRead('who', load)).toBe(1);
    expect(await requestRead('who', load)).toBe(2);
  });

  it('answers a repeated lookup from the first read inside one request', async () => {
    let reads = 0;
    const load = async () => ++reads;
    const answers = await sharingRequestReads(new Map(), () =>
      Promise.all([
        requestRead('who', load),
        requestRead('who', load),
        requestRead('other', load),
      ]),
    );
    expect(answers).toEqual([1, 1, 2]);
  });

  it('keeps two requests apart', async () => {
    const load = (value: string) => async () => value;
    const first = sharingRequestReads(new Map(), () =>
      requestRead('who', load('first')),
    );
    const second = sharingRequestReads(new Map(), () =>
      requestRead('who', load('second')),
    );
    expect(await Promise.all([first, second])).toEqual(['first', 'second']);
  });

  it('does not share a failed lookup', async () => {
    let reads = 0;
    const load = async () => {
      reads += 1;
      if (reads === 1) throw new Error('unavailable');
      return reads;
    };
    await sharingRequestReads(new Map(), async () => {
      await expect(requestRead('who', load)).rejects.toThrow('unavailable');
      await Promise.resolve();
      expect(await requestRead('who', load)).toBe(2);
    });
  });

  it('reads as before when the request has no cache, as writes do', async () => {
    let reads = 0;
    const load = async () => ++reads;
    await sharingRequestReads(undefined, async () => {
      await requestRead('who', load);
      await requestRead('who', load);
    });
    expect(reads).toBe(2);
  });
});
