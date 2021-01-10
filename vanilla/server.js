import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import WebSocket from 'ws';
import { chromium } from 'playwright';
import DiffMatchPatch from 'diff-match-patch';
import { toKnownEvents$, toSystemEvents$, toUserEvents$, decodedEvents$, } from './decodeClientEvents';
console.clear();
const diffEngine = new DiffMatchPatch.diff_match_patch();
function domDiff(doma, domb) {
    return diffEngine.diff_main(doma, domb);
}
export const remoteRender = (ws, url) => {
    const clientEvents$ = fromEvent(ws, 'message');
    const handledEvents$ = clientEvents$.pipe(map((e) => e.data), toKnownEvents$);
    const userEvents$ = handledEvents$.pipe(toUserEvents$, decodedEvents$);
    userEvents$.subscribe((e) => {
        console.log('USER Event received:', e);
    });
    const systemEvents$ = handledEvents$.pipe(toSystemEvents$, decodedEvents$);
    systemEvents$.subscribe((e) => {
        console.log('SYSTEM Event received:', e);
    });
    // clientSystem$.subscribe(what => {
    //   console.log('uievents system', what.data);
    // })
    // const clientSynced$ = clientSystem$.pipe(filter((data) => data === 'synced'));
    // const throttledMutations$ = DOMMutations$.pipe(
    //   windowWhen(() => clientSynced$),
    //   map((win) => win.pipe(take(1))),
    //   mergeAll()
    // );
    // const DOM$ = throttledMutations$.pipe(
    //   map(() => {return Promise.resolve('<html>the page</html>')}),
    //   mergeAll()
    // )
    // const DOMPairs$ = DOM$.pipe(pairwise());
    // const DOMDiffs$ = DOMPairs$.pipe(
    //   map(([prev, curr]) => {
    //     return domDiff(prev, curr)
    //   })
    // )
    // DOMMutations$.subscribe((mutationcount) => {
    //   ws.send(JSON.stringify({_type:'dommutation', count: mutationcount}))
    // });
    // DOMDiffs$.subscribe((domdiff) => {
    //   ws.send(JSON.stringify({_type:'domdiff', count: domdiff}))
    // })
};
const launchBrowser = () => {
    return chromium.launch();
};
// const launchBrowser = () => pipe(
//   bindTo('browser')()
// )
(async () => {
    const browser = await chromium.launch();
    console.log('launching browser');
    // Create a new incognito browser context
    const context = await browser.newContext();
    // Create a new page inside context.
    const page = await context.newPage();
    await page.goto('https://abtastyspa.bfulop.now.sh');
    console.log('went to page');
    await page.evaluate(() => {
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
        page.on('console', (msg) => {
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
    const wss = new WebSocket.Server({ port: 8088 });
    wss.on('connection', (what, req) => {
        console.log('********************************************what is req');
        console.log(req.url);
    });
    // wss.on('connection', remoteRender(page, mutationObservable));
});
