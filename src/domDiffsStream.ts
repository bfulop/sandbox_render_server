import {
  task as T,
  reader as R,
  function as F,
} from 'fp-ts';
import {
  map,
  filter,
  windowWhen,
  mergeAll,
  take,
  switchMap,
  startWith,
  pairwise,
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import DiffMatchPatch from 'diff-match-patch';
import type { PrimaryData } from './server';
import type { DOMString } from './getBrowserPage';
import { getPageContent } from './getBrowserPage';
import { fromTask } from 'fp-ts-rxjs/es6/Observable';
import { DiffMessage } from './codecs';

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
  r.pipe(switchMap(():T.Task<string> => fromTask(getPageContent(env.client.page))));

const diffWorkflow : R.Reader<PrimaryData, Observable<DOMString>> =
  F.pipe(
    R.ask<PrimaryData>(),
    R.chain(domRequests$),
    R.chain(domStrings$)
  );

const completeDomStrings$ : R.Reader<PrimaryData, Observable<DOMString>> =
  F.pipe(
    diffWorkflow,
    R.chain((a) => (b) => {
      return a.pipe(startWith(b.client.DOMstring));
    })
  );

export const DOMDiffsStream = F.pipe(
  completeDomStrings$,
  R.map((a) =>
    a.pipe(
      pairwise(),
      map(([a, b]) => domDiff(a, b))
    )
  ),
  R.map(e => e.pipe(map(patch => DiffMessage.encode({type: 'diff', payload: patch})))),
);
