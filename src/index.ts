import express from 'express';
import * as E from 'fp-ts/es6/Either';
import { pipe } from 'fp-ts/es6/function';
import * as t from 'io-ts/es6/index';
import * as H from 'hyper-ts/es6/index';
import * as TE from 'fp-ts/es6/TaskEither';
import { toRequestHandler } from 'hyper-ts/es6/express';
import { IntFromString } from 'io-ts-types/lib/IntFromString';
import { Browser, BrowserContext, chromium } from 'playwright';
import WebSocket from 'ws';
import { addClient } from './connections';
import { getPage } from './getBrowserPage';
import { remoteRender } from './server';

const browser = await chromium.launch();
const wss = new WebSocket.Server({ port: 8088 });
wss.on('connection', (ws, { url }) => remoteRender(ws, url));

// return a middleware validating the query "order=desc&shoe[color]=blue&shoe[type]=converse"
const decodePageQuery: H.Middleware<
  H.StatusOpen,
  H.StatusOpen,
  string,
  { pageurl: string }
> = pipe(
  H.decodeQuery(t.strict({ pageurl: t.string }).decode),
  H.mapLeft(() => 'could not decode requested page url')
);

const safeAsync = (
  apageurl: string
): TE.TaskEither<string, { second: string }> =>
  TE.tryCatch(
    (): Promise<{ second: string }> =>
      Promise.resolve({ second: apageurl + 'second' }),
    () => 'eerr'
  );

const createBrowserContext = (b: Browser) => (u: string) =>
  pipe(
    getPage(b)(u),
    TE.bimap(() => 'error creating browser context', (e) => addClient(e)),
  );

function badRequest(
  message: string
): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> {
  return pipe(
    H.status(H.Status.BadRequest),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send('bad request ' + message))
  );
}

const doAPIWork = (browser: Browser) => (pageurl: string) =>
  H.fromTaskEither(createBrowserContext(browser)(pageurl));

const getWebSiteHandler = pipe(
  decodePageQuery,
  H.chain(({ pageurl }) => doAPIWork(browser)(pageurl)),
  H.ichain((second) =>
    pipe(
      H.status<string>(H.Status.OK),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.send(JSON.stringify(second())))
    )
  ),
  H.orElse(badRequest)
);

const app = express();

app
  .get('/getpage', toRequestHandler(getWebSiteHandler))
  // .get('/getpage', (req, res) => {
  //   console.log('got some request', req)
  //   res.send('ok I got the request')
  // })
  .listen(3021, () =>
    console.log('Express listening on port 3021.')
  );
