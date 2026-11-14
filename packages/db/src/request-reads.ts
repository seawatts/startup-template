import { AsyncLocalStorage } from 'node:async_hooks';

// A web request's reads answer "who is asking" once between them. Each read
// of a batch used to look up the same session, membership and access rows
// again. Inside `sharingRequestReads` (wrap the API handler's GET batches
// only), `requestRead` answers a lookup from the first read that asked;
// anywhere else, including every write, it reads as before.
const requestReads = new AsyncLocalStorage<Map<string, Promise<unknown>>>();
export function sharingRequestReads<T>(
  cache: Map<string, Promise<unknown>> | undefined,
  fn: () => T,
): T {
  return cache ? requestReads.run(cache, fn) : fn();
}
/** The answer an earlier read in this request already asked for, if any. */
export function sharedRequestRead<T>(key: string) {
  return requestReads.getStore()?.get(`read\u0000${key}`) as
    | Promise<T>
    | undefined;
}
export function requestRead<T>(key: string, load: () => Promise<T>) {
  const cache = requestReads.getStore();
  if (!cache) return load();
  const full = `read\u0000${key}`;
  let read = cache.get(full) as Promise<T> | undefined;
  if (!read) {
    read = load();
    cache.set(full, read);
    // A failed lookup isn't shared: the next read asks again.
    read.catch(() => {
      if (cache.get(full) === read) cache.delete(full);
    });
  }
  return read;
}
