import { reader as R, task as T, function as F, option as O } from 'fp-ts';
import { fromTask, filterMap, map as mapObs } from 'fp-ts-rxjs/es6/Observable';
import type { Page } from 'playwright/types/types';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
// import type { MouseEvent } from './decodeClientEvents';
// import { UserEvents } from './decodeClientEvents';
import type { PrimaryData } from './server';
import { MouseAction, FormAction } from './codecs';

const doMoveMouse = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.mouse.move(e.payload.x, e.payload.y).then(() => e);

const doclickMouse = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.mouse.click(e.payload.x, e.payload.y).then(() => e);

const doScroll = (e: MouseAction) => (p: Page): T.Task<MouseAction> => () => p.evaluate(({ x, y }) => {
  window.scrollTo(x, y);
}, e.payload).then(() => e)

// TODO: this should be really done in one step
// get an element handle
// 1 fill it
// 2 update it's value
const doFormAction = (e: FormAction) => (p: Page): T.Task<FormAction> => () => p.fill(`:nth-match(${e.payload.tagname}, ${e.payload.index + 1})`, e.payload.value)
  .then(() => p.$(`:nth-match(${e.payload.tagname}, ${e.payload.index + 1})`))
  .then((el) => {
    if (el) el.evaluate((node, val) => node.setAttribute('value', val), e.payload.value)
  }
  )
  .then(() => e)


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

const fillForm = (formAction: Observable<FormAction>): R.Reader<PrimaryData, Observable<FormAction>> => F.pipe(
  R.asks<PrimaryData, Page>(e => e.client.page),
  R.map((page) => formAction.pipe(
    filter(e => e.type === 'formaction'),
    switchMap<FormAction, Observable<FormAction>>((me: FormAction) => fromTask<FormAction>(doFormAction(me)(page)))
  ))
)


export const mouseEventsStream = F.pipe(
  R.asks<PrimaryData, Observable<unknown>>(e => e.userEvents),
  R.map(F.flow(mapObs(MouseAction.decode), filterMap(O.fromEither))),
  R.chain(e => R.sequenceArray([clickMouse(e), moveMouse(e), scrollWindow(e),])),
)

export const formActionStream = F.pipe(
  R.asks<PrimaryData, Observable<unknown>>(e => e.userEvents),
  R.map(F.flow(mapObs(FormAction.decode), filterMap(O.fromEither))),
  R.chain(e => fillForm(e)),
)
