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
import { UserEvents } from './decodeClientEvents';
import type { MouseEvent } from './decodeClientEvents';
import type {
  Browser,
  BrowserContext,
  Page,
  Response,
} from 'playwright/types/types';

const doMoveMouse = (e: UserEvents) => (p: Page): T.Task<UserEvents> => () => {
  return p.mouse.move(e.x, e.y).then(() => e);
}

type MoveMouse = () => R.Reader<PrimaryData, Observable<never>>
const moveMouse: MoveMouse = () => (env: PrimaryData) =>
  pipe(
  env.userEvents,
  filter(e => e.type === 'mousemove'),
  switchMap((e):T.Task<string> => fromTask(doMoveMouse(e)(env.client.page))
  )
)

const doclickMouse = (e: MouseEvent) => (p: Page): T.Task<MouseEvent> => () => {
  return p.mouse.click(e.x, e.y).then(() => e);
}

const clickMouse = pipe(
  R.ask<PrimaryData>(),
  R.map(e => pipe(
    e,
    r => r.userEvents,
    filter(r => r.type === 'mouseclick'),
    switchMap(r => fromTask<MouseEvent>(doclickMouse(r)(e.client.page))),
    r => {
        r.subscribe(e => e)
        return r;
      }
  ))
)

const replies = (r: Observable<unknown>) => (env: PrimaryData) => 
 r.subscribe((e) => {
  // console.log('mousemoved sent', e);
  env.send(JSON.stringify({type: 'mousemoved', payload: e}));
})

export const UserEventsStream = pipe(
  clickMouse,
  R.chain(moveMouse),
  R.chainFirst(replies)
);
