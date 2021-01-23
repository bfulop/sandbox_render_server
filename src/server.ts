import { from, fromEvent, Observable, of } from 'rxjs';
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
import WebSocket from 'ws';
import { Browser, BrowserContext, chromium } from 'playwright';
import type { Page } from 'playwright';
import DiffMatchPatch from 'diff-match-patch';
import {
  toKnownEvents$,
  toSystemEvents$,
  toUserEvents$,
  decodedEvents$,
} from './decodeClientEvents';
import type {
  HandledEvents,
  UserEvents,
  SystemEvents,
} from './decodeClientEvents';
import { flow, identity, pipe } from 'fp-ts/es6/function';
import {
  either as E,
  taskEither as TE,
  task as T,
  reader as R,
  readerEither as RE,
} from 'fp-ts';
import * as D from 'io-ts/es6/Decoder';
import { UUID } from 'io-ts-types';
import { aConncection, getClient } from './connections';
import { ObservableEither } from 'fp-ts-rxjs/es6/ObservableEither';
import { getPageContent } from './getBrowserPage';
import type { DOMString } from './getBrowserPage';
import { fromTask } from 'fp-ts-rxjs/es6/Observable';

interface PrimaryData {
  client: aConncection;
  domMutations: Observable<number>;
  clientEvents: Observable<WebSocket.MessageEvent>;
  handledEvents: ObservableEither<Error, HandledEvents>;
  userEvents: Observable<UserEvents>;
  systemEvents: Observable<SystemEvents>;
  send: (a: any) => void;
}

const diffEngine = new DiffMatchPatch.diff_match_patch();

function domDiff(doma: string, domb: string) {
  return diffEngine.patch_make(doma, domb);
}

// const clientSynced$ = clientSystem$.pipe(filter((data) => data === 'synced'));
// const throttledMutations$ = DOMMutations$.pipe(
//   windowWhen(() => clientSynced$),
//   map((win) => win.pipe(take(1))),
//   mergeAll()
// );

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
  r.pipe(switchMap(() => fromTask(getPageContent(env.client.page))));

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

const DOMMutations$ = (p: Page): Observable<number> => {
  p.evaluate(() => {
    const observer = new MutationObserver(function () {
      console.log('__mutation');
    });
    const config = {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    };
    observer.observe(document.body, config);
  });

  let mutationObservable = new Observable<number>((observer) => {
    let mutationsCount = 0;
    p.on('console', (msg) => {
      const message = msg.text();
      if (message === '__mutation') {
        mutationsCount += 1;
        observer.next(mutationsCount);
      }
    });
    return () => {
      mutationsCount = 0;
    };
  });
  return mutationObservable;
};

const isString: D.Decoder<unknown, string> = {
  decode: (u) =>
    typeof u === 'string' ? D.success(u) : D.failure(u, 'string'),
};

const isId = (t: string) => UUID.decode(t);

const decodeId = (url: string | undefined) =>
  pipe(
    isString.decode(url),
    E.map((e: string) => e.replace('/', '')),
    E.chainW((e) => isId(e))
  );

// remote render flow:
// 1. set up primary streams
// |> decode url (either) ✔︎
// |> getClient (either) ✔︎
// |> set up streams ✔︎
// |> set up DOMMutation stream ✔︎
// |> left: 'could not set up' right: ({ Client, system$, user$, mutations$ })

// > push a system message to client : failure | DOMString

// 2. set up secondary streams
// |> system$.patched + mutations$ |> diffWorkflow |> send DOM diff
// |> user$ |> pageUpdate

const browserContextFromURL = (url: string | undefined) => {
  return pipe(
    decodeId(url),
    E.bimap(() => 'could not decode url', getClient),
    E.map((e) => e()),
    E.chain(E.fromOption(() => 'could not get client'))
  );
};

export const remoteRender = (ws: WebSocket, url: string | undefined) => {
  const mainApp = (anurl: string | undefined): E.Either<string, PrimaryData> =>
    pipe(
      // T.bindTo('context')(getContext(browser)),
      E.bindTo('client')(browserContextFromURL(anurl)),
      E.bind('domMutations', ({ client }) =>
        E.right(DOMMutations$(client.page))
      ),
      E.bind('clientEvents', () =>
        E.right(<Observable<WebSocket.MessageEvent>>fromEvent(ws, 'message'))
      ),
      E.bind('send', () => E.right((a: string) => ws.send(a))),
      E.bind('handledEvents', ({ clientEvents }) =>
        E.right(
          pipe(
            clientEvents,
            map((e) => e.data),
            toKnownEvents$
          )
        )
      ),
      E.bind('userEvents', ({ handledEvents }) =>
        E.right(pipe(handledEvents, toUserEvents$, decodedEvents$))
      ),
      E.bind('systemEvents', ({ handledEvents }) =>
        E.right(pipe(handledEvents, toSystemEvents$, decodedEvents$))
      )
    );

  // TODO: send here the first DOM string
  // when client finished, will send a DOMPatched event

  const DOMStringMutations$ = (url: string | undefined) =>
    pipe(
      mainApp(url),
      E.map(
        pipe(
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
        )
      )
    );

  flow(
    DOMStringMutations$,
    E.mapLeft((a) => {
      console.log('somererr', a);
      ws.send(JSON.stringify({ type: 'initerror', payload: a }));
      return a;
    })
  )(url);
};
