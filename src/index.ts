import {
  function as F,
  taskEither as TE,
  io as IO,
} from 'fp-ts';
import express from 'express';
import * as t from 'io-ts';
import { IntFromString } from 'io-ts-types'
import * as H from 'hyper-ts';
import { toRequestHandler } from 'hyper-ts/lib/express';
import { Browser, chromium } from 'playwright';
import https from 'https';
import fs from 'fs';
import WebSocket from 'ws';
import { addClient } from './connections';
import { getPage } from './getBrowserPage';
import { remoteRender } from './server';
import { LoadedPage } from './codecs';

const browser = await chromium.launch({ headless: true });

const server = https.createServer({
  cert: fs.readFileSync('../abundance-design_fr.crt'),
  key: fs.readFileSync('../abundance-design.fr.key')
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, { url }) => remoteRender(ws, url));
server.listen(8088);

const decodePageQueryParams = F.pipe(
  H.decodeQuery(
    t.strict({
      url: t.string,
      window: t.strict({
        width: IntFromString,
        height: IntFromString
      })
    }).decode
  ),
  H.mapLeft(e => {
    console.error(e);
    return 'page query decode error';
  })
);

const createBrowserContext = (b: Browser) => (u: pageOpenParams) =>
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

export type pageOpenParams = {
  url: string,
  window: {
    width: number,
    height: number
  }
}

const doAPIWork = (browser: Browser) => (pageurl: pageOpenParams) =>
  H.fromTaskEither(createBrowserContext(browser)(pageurl));

const getWebSiteHandler = F.pipe(
  decodePageQueryParams,
  H.map(e => { 
    console.log('the decoded stuff:')
    console.log(e);
    return e
  }),
  H.chain((pageurl: pageOpenParams) => doAPIWork(browser)(pageurl)),
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
  // .use('/', express.static('../render_client_v3/build'))
  .get('/getpage/', toRequestHandler(getWebSiteHandler))
  .listen(3021, () =>
    console.log('Express listening on port 3021.')
  );
