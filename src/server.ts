import { function as F,
  either as E, 
  reader as R,
  option as O,
  json
} from 'fp-ts';
import { UUID } from 'io-ts-types';
import { filterMap, map as mapObs } from 'fp-ts-rxjs/es6/Observable';
import * as D from 'io-ts/es6/Decoder';
import type { Page } from 'playwright';
import { fromEvent, Observable } from 'rxjs';
import type WebSocket from 'ws';
import { aConncection, getClient } from './connections';
import {
  SystemEvents,
  UserEvent,
  WebSocketMessage,
  KnownEvent
} from './codecs';
import { DOMDiffsStream } from './domDiffsStream';
import { mouseEventsStream } from './userEventsStreams';

export interface PrimaryData {
  client: aConncection;
  domMutations: Observable<number>;
  clientEvents: Observable<KnownEvent>;
  userEvents: Observable<UserEvent>;
  systemEvents: Observable<SystemEvents>;
  send: (a: any) => void;
}

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
  F.pipe(
    isString.decode(url),
    E.map((e: string) => e.replace('/', '')),
    E.chainW((e) => isId(e))
  );

// remote render F.flow:
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
  return F.pipe(
    decodeId(url),
    E.bimap(() => 'could not decode url', getClient),
    E.map((e) => e()),
    E.chain(E.fromOption(() => 'could not get client'))
  );
};

const getKnownEvents = (ws: WebSocket) =>
  F.pipe(
    ws,
    (s) => fromEvent(s, 'message'),
    mapObs((e: unknown) =>
      F.pipe(
        e,
        WebSocketMessage.decode,
        E.chainW((e) => F.pipe(e, (b) => json.parse(b.data))),
        E.chainW(KnownEvent.decode)
      )
    ),
    filterMap(O.fromEither),
    E.right
  );

export const remoteRender = (ws: WebSocket, url: string | undefined) => {
  const mainApp = (anurl: string | undefined): E.Either<string, PrimaryData> =>
    F.pipe(
      E.bindTo('client')(browserContextFromURL(anurl)),
      E.bind('domMutations', ({ client }) =>
        E.right(DOMMutations$(client.page))
      ),
      E.bindW('clientEvents', () => getKnownEvents(ws)),
      E.bind('send', () => E.right((a: string) => ws.send(a))),
      E.bindW(
        'userEvents',
        ({ clientEvents }): E.Either<never, Observable<UserEvent>> =>
          F.pipe(
            clientEvents,
            mapObs(UserEvent.decode),
            filterMap(O.fromEither),
            E.right
          )
      ),
      E.bindW(
        'systemEvents',
        ({ clientEvents }): E.Either<never, Observable<SystemEvents>> =>
          F.pipe(
            clientEvents,
            mapObs(SystemEvents.decode),
            filterMap(O.fromEither),
            E.right
          )
      )
    );

  const allThePipes = F.pipe(
    R.bindTo('diffStream')(DOMDiffsStream),
    R.bind('mouseStream', () => mouseEventsStream),
    // push the responses
    R.chain((streams) =>
      F.pipe(
        R.asks<PrimaryData, (a: unknown) => void>((e) => e.send),
        R.map((send) => {
          console.log('gonna subscribe OK');
          streams.diffStream.subscribe((b) => {
            F.pipe(b, json.stringify, E.map(send), E.mapLeft(() => send('could not stringify data')));
          });
          streams.mouseStream.map((e) =>
            e.subscribe((b) => {
              F.pipe(b, json.stringify, E.map(send), E.mapLeft(() => send('could not stringify data')));
            })
          );
          return streams;
        })
      )
    )
  );

  const startStreams = (url: string | undefined) =>
    F.pipe(mainApp(url), E.map(allThePipes));

  // Where we pull the trigger
  F.flow(
    startStreams,
    E.mapLeft((a) => {
      console.log('somererr', a);
      ws.send(JSON.stringify({ type: 'initerror', payload: a }));
      return a;
    })
  )(url);



};
