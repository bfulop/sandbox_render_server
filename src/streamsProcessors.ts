import DiffMatchPatch from 'diff-match-patch';
import {
    reader as R,
    function as F
} from 'fp-ts';
import { fromTask } from 'fp-ts-rxjs/lib/Observable';
import { Observable } from 'rxjs';
import {
    filter, map, mergeAll, pairwise, startWith, switchMap, take, windowWhen
} from 'rxjs/operators';
import type { DOMString } from './getBrowserPage';
import { getPageContent } from './getBrowserPage';
import type { PrimaryData } from './server';

const diffEngine = new DiffMatchPatch.diff_match_patch();

function domDiff(doma: string, domb: string) {
  return diffEngine.patch_make(doma, domb);
}

const domRequests$ = (): R.Reader<PrimaryData, Observable<number>> => (
  env: PrimaryData
) => {
  const patched$ = F.pipe(
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
  r.pipe(switchMap(():Observable<string> => fromTask(getPageContent(env.client.page))));

const diffWorkflow = (): R.Reader<PrimaryData, Observable<DOMString>> =>
  F.pipe(
    F.identity,
    // |> create a stream of throttledMutations (DOMMutations + Synced) ✔︎
    R.chain(domRequests$),
    // |> F.pipe the stream into getDOM (Reader ask) ✔︎
    R.chain(domStrings$)
  );

const completeDomStrings$ = (): R.Reader<PrimaryData, Observable<DOMString>> =>
  F.pipe(
    F.identity,
    R.chain(() => diffWorkflow()),
    R.chain((a) => (b) => {
      return a.pipe(startWith(b.client.DOMstring));
    })
  );

export const DOMDiffsStream = F.pipe(
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
