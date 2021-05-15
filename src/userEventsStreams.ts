import { reader as R, task as T, function as F, option as O } from 'fp-ts';
import { fromTask, filterMap, map as mapObs } from 'fp-ts-rxjs/es6/Observable';
import type { Page } from 'playwright/types/types';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
// import type { MouseEvent } from './decodeClientEvents';
// import { UserEvents } from './decodeClientEvents';
import type { PrimaryData } from './server';
import { MouseAction } from './codecs';

const doMoveMouse = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.mouse.move(e.payload.x, e.payload.y).then(() => e);

const doclickMouse = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.mouse.click(e.payload.x, e.payload.y).then(() => e);

const doScroll = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.evaluate(({ x, y }) => {
  window.scrollTo(x, y);
}, e.payload).then(() => e)

const moveMouse = (mousevents: Observable<MouseAction>): R.Reader<PrimaryData, Observable<MouseAction>> => F.pipe(
  R.asks<PrimaryData, Page>(e => e.client.page),
  R.map((page) => mousevents.pipe(
    filter(e => e.type === 'mousemoved'),
    switchMap<MouseAction, Observable<MouseAction>>((me: MouseAction) => fromTask<MouseAction>(doMoveMouse(me)(page)))
  ))
)

const clickMouse = (mousevents: Observable<MouseAction>): R.Reader<PrimaryData, Observable<MouseAction>> => F.pipe(
  R.asks<PrimaryData, Page>(e => e.client.page),
  R.map((page) => mousevents.pipe(
    filter(e => e.type === 'mouseclick'),
    switchMap<MouseAction, Observable<MouseAction>>((me: MouseAction) => fromTask<MouseAction>(doclickMouse(me)(page)))
  ))
)

const scrollWindow = (scrollevent: Observable<MouseAction>): R.Reader<PrimaryData, Observable<MouseAction>> => F.pipe(
  R.asks<PrimaryData, Page>(e => e.client.page),
  R.map((page) => scrollevent.pipe(
    filter(e => e.type === 'windowscroll'),
    switchMap<MouseAction, Observable<MouseAction>>((me: MouseAction) => fromTask<MouseAction>(doScroll(me)(page)))
  ))
)

export const mouseEventsStream = F.pipe(
  R.asks<PrimaryData, Observable<unknown>>(e => e.userEvents),
  R.map(F.flow(mapObs(MouseAction.decode), filterMap(O.fromEither))),
  R.chain(e => R.sequenceArray([clickMouse(e), moveMouse(e), scrollWindow(e)])),
)
