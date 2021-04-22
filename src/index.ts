import {
  function as F,
  taskEither as TE,
  io as IO,
} from 'fp-ts';
import express from 'express';
import * as t from 'io-ts';
import * as H from 'hyper-ts/es6/index';
import { toRequestHandler } from 'hyper-ts/es6/express';
import { Browser, chromium } from 'playwright';
import WebSocket from 'ws';
import { addClient } from './connections';
import { getPage } from './getBrowserPage';
import { remoteRender } from './server';
import { LoadedPage } from './codecs';

const browser = await chromium.launch();
const wss = new WebSocket.Server({ port: 8088 });
wss.on('connection', (ws, { url }) => remoteRender(ws, url));

const decodeParam = F.pipe(
  H.decodeParam('pageurl', t.string.decode),
  H.mapLeft((e) => {
    console.error(e);
    return 'page query decode error'})
);

const createBrowserContext = (b: Browser) => (u: string) =>
  F.pipe(
    getPage(b)(u),
    TE.bimap(() => 'error creating browser context', (e) => addClient(e)),
    TE.map(e => F.pipe(e, IO.map(LoadedPage.encode)))
  );

function badRequest(
  message: string
): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> {
  return F.pipe(
    H.status(H.Status.BadRequest),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send('bad request ' + message))
  );
}

const doAPIWork = (browser: Browser) => (pageurl: string) =>
  H.fromTaskEither(createBrowserContext(browser)(pageurl));

const getWebSiteHandler = F.pipe(
  decodeParam,
  H.chain(pageurl => doAPIWork(browser)(pageurl)),
  H.ichain(loadedpage =>
    F.pipe(
      H.status<string>(H.Status.OK),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.send(JSON.stringify(loadedpage())))
    )
  ),
  H.orElse(badRequest)
);

const app = express();

app
  .use('/client', express.static('../render_client_v3/build'))
  .get('/getpage/:pageurl', toRequestHandler(getWebSiteHandler))
  // .get('/getpage', (req, res) => {
  //   console.log('got some request', req)
  //   res.send('ok I got the request')
  // })
  .listen(3021, () =>
    console.log('Express listening on port 3021.')
  );
