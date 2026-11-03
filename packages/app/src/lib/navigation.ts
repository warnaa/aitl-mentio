/**
 * A full page load, not a client-side push. Used after anything that changes the
 * session (sign-in, sign-out): the server-rendered tree must be rebuilt for the new
 * session, and a soft navigation could render stale chrome until the next server round
 * trip (primitives spec F4). A seam so tests can observe it — jsdom's
 * `window.location.assign` is not replaceable.
 */
export const navigation = {
  assign(path: string): void {
    window.location.assign(path);
  },
};
