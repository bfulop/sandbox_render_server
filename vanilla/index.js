import express from 'express';
import { pipe } from 'fp-ts/es6/pipeable';
import * as t from 'io-ts/es6/index';
import * as H from 'hyper-ts/es6/index';
import { toRequestHandler } from 'hyper-ts/es6/express';
const decodeUser = pipe(H.decodeParam('user_id', t.string.decode), H.mapLeft(() => 'what'));
function badRequest(message) {
    return pipe(H.status(H.Status.BadRequest), H.ichain(() => H.closeHeaders()), H.ichain(() => H.send(message)));
}
const hello = pipe(decodeUser, H.ichain((name) => pipe(H.status(H.Status.OK), H.ichain(() => H.closeHeaders()), H.ichain(() => H.send(`Hello ${name}!`)))), H.orElse(badRequest));
const app = express();
app
    .get('/getpage/:user_id', toRequestHandler(hello))
    // tslint:disable-next-line: no-console
    .listen(3000, () => console.log('Express listening on port 3000. Use: POST /'));
