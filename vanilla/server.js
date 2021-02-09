import { fromEvent, Observable } from 'rxjs';
import { map, filter, windowWhen, mergeAll, take, switchMap, startWith, pairwise, } from 'rxjs/operators';
import DiffMatchPatch from 'diff-match-patch';
import { toKnownEvents$, toSystemEvents$, toUserEvents$, decodedEvents$, } from './decodeClientEvents';
import { flow, identity, pipe } from 'fp-ts/es6/function';
import { either as E, reader as R, } from 'fp-ts';
import * as D from 'io-ts/es6/Decoder';
import { UUID } from 'io-ts-types';
import { getClient } from './connections';
import { getPageContent } from './getBrowserPage';
import { fromTask } from 'fp-ts-rxjs/es6/Observable';
const diffEngine = new DiffMatchPatch.diff_match_patch();
function domDiff(doma, domb) {
    return diffEngine.patch_make(doma, domb);
}
// const clientSynced$ = clientSystem$.pipe(filter((data) => data === 'synced'));
// const throttledMutations$ = DOMMutations$.pipe(
//   windowWhen(() => clientSynced$),
//   map((win) => win.pipe(take(1))),
//   mergeAll()
// );
const domRequests$ = () => (env) => {
    const patched$ = pipe(env.systemEvents, filter((e) => e.type === 'DOMpatched'));
    return env.domMutations.pipe(windowWhen(() => patched$), map((win) => win.pipe(take(1))), mergeAll());
};
const domStrings$ = (r) => (env) => r.pipe(switchMap(() => fromTask(getPageContent(env.client.page))));
const diffWorkflow = () => pipe(identity, 
// |> create a stream of throttledMutations (DOMMutations + Synced) ✔︎
R.chain(domRequests$), 
// |> pipe the stream into getDOM (Reader ask) ✔︎
R.chain(domStrings$));
const completeDomStrings$ = () => pipe(identity, R.chain(() => diffWorkflow()), R.chain((a) => (b) => {
    return a.pipe(startWith(b.client.DOMstring));
}));
const DOMMutations$ = (p) => {
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
    let mutationObservable = new Observable((observer) => {
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
const isString = {
    decode: (u) => typeof u === 'string' ? D.success(u) : D.failure(u, 'string'),
};
const isId = (t) => UUID.decode(t);
const decodeId = (url) => pipe(isString.decode(url), E.map((e) => e.replace('/', '')), E.chainW((e) => isId(e)));
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
const browserContextFromURL = (url) => {
    return pipe(decodeId(url), E.bimap(() => 'could not decode url', getClient), E.map((e) => e()), E.chain(E.fromOption(() => 'could not get client')));
};
export const remoteRender = (ws, url) => {
    const mainApp = (anurl) => pipe(
    // T.bindTo('context')(getContext(browser)),
    E.bindTo('client')(browserContextFromURL(anurl)), E.bind('domMutations', ({ client }) => E.right(DOMMutations$(client.page))), E.bind('clientEvents', () => E.right(fromEvent(ws, 'message'))), E.bind('send', () => E.right((a) => ws.send(a))), E.bind('handledEvents', ({ clientEvents }) => E.right(pipe(clientEvents, map((e) => e.data), toKnownEvents$))), E.bind('userEvents', ({ handledEvents }) => E.right(pipe(handledEvents, toUserEvents$, decodedEvents$))), E.bind('systemEvents', ({ handledEvents }) => E.right(pipe(handledEvents, toSystemEvents$, decodedEvents$))));
    // TODO: send here the first DOM string
    // when client finished, will send a DOMPatched event
    const DOMStringMutations$ = (url) => pipe(mainApp(url), E.map(pipe(completeDomStrings$(), R.map((a) => a.pipe(pairwise(), map(([a, b]) => domDiff(a, b)))), R.chainFirst((a) => (b) => {
        a.subscribe((e) => {
            b.send(JSON.stringify({ type: 'diff', payload: e }));
        });
    }))));
    flow(DOMStringMutations$, E.mapLeft((a) => {
        console.log('somererr', a);
        ws.send(JSON.stringify({ type: 'initerror', payload: a }));
        return a;
    }))(url);
};
