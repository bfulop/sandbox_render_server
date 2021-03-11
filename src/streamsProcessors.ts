import {
  either as E,
  taskEither as TE,
  task as T,
  reader as R,
  readerEither as RE,
} from 'fp-ts';
import {
  map,
  filter,
  windowToggle,
  windowWhen,
  mergeAll,
  take,
  concat,
  switchMap,
  startWith,
  pairwise,
} from 'rxjs/operators';
import { from, fromEvent, Observable, of } from 'rxjs';
import DiffMatchPatch from 'diff-match-patch';
import type { PrimaryData } from './server';
import type { DOMString } from './getBrowserPage';
import { identity, pipe } from 'fp-ts/es6/function';
import { getPageContent } from './getBrowserPage';
import { fromTask } from 'fp-ts-rxjs/es6/Observable';

const diffEngine = new DiffMatchPatch.diff_match_patch();

function domDiff(doma: string, domb: string) {
  return diffEngine.patch_make(doma, domb);
}

const domRequests$ = (): R.Reader<PrimaryData, Observable<number>> => (
  env: PrimaryData
) => {
  const patched$ = pipe(
    env.systemEvents,
    filter((e) => e.type === 'DOMpatched')
  );
  return env.domMutations.pipe(
    windowWhen(() => patched$),
    map((win) => win.pipe(take(1))),
    mergeAll()
  );
};

const domStrings$ = (r: Observable<number>) => (env: PrimaryData) =>
  r.pipe(switchMap(():T.Task<string> => fromTask(getPageContent(env.client.page))));

const diffWorkflow = (): R.Reader<PrimaryData, Observable<DOMString>> =>
  pipe(
    identity,
    // |> create a stream of throttledMutations (DOMMutations + Synced) ✔︎
    R.chain(domRequests$),
    // |> pipe the stream into getDOM (Reader ask) ✔︎
    R.chain(domStrings$)
  );

const completeDomStrings$ = (): R.Reader<PrimaryData, Observable<DOMString>> =>
  pipe(
    identity,
    R.chain(() => diffWorkflow()),
    R.chain((a) => (b) => {
      return a.pipe(startWith(b.client.DOMstring));
    })
  );

export const DOMDiffsStream = pipe(
  completeDomStrings$(),
  R.map((a) =>
    a.pipe(
      pairwise(),
      map(([a, b]) => domDiff(a, b))
    )
  ),
  R.chainFirst((a) => (b) => {
    a.subscribe((e) => {
      b.send(JSON.stringify({ type: 'diff', payload: e }));
    });
  })
);
