import express from 'express';
import * as E from 'fp-ts/es6/Either';
import * as H from 'hyper-ts/es6/index';
import * as t from 'io-ts/es6/index';
import {decodeParam} from 'hyper-ts/es6/index';
import {toRequestHandler} from 'hyper-ts/es6/express';
import {pipe} from 'fp-ts/es6/pipeable';

function badRequest(message: Error) {
  return pipe(
    H.status(H.Status.BadRequest),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send(message.message)),
  );
}

// returns a middleware validating `req.param.user_id`
const decodeUser: H.Middleware<H.StatusOpen, H.StatusOpen, any, any> = pipe(
  H.decodeParam('user_id', t.string.decode),
  H.mapLeft(() => new Error('what'))
);

// returns a middleware validating `req.param.user_id`
// const decodeUser = pipe(
//   decodeParam('user_id', t.string.decode),
//   H.mapLeft(() => new Error('what'))
// )

const getPage:H.Middleware<H.StatusOpen, H.ResponseEnded, never, any> = pipe(
  decodeUser,
  H.ichain(() => pipe(
    H.status(H.Status.OK),
    H.ichain(pipe(
      H.ichain(() => H.closeHeaders()), // tells hyper-ts that we're done with the headers
      H.ichain(() => H.send('Hello hyper-ts on express!')), // sends the response as text
    ))
  ))
  // H.ichain(() => H.())
);

const hello: H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> = pipe(
  H.status(H.Status.OK), // writes the response status
  H.ichain(() => H.closeHeaders()), // tells hyper-ts that we're done with the headers
  H.ichain(() => H.send('Hello hyper-ts on express!')), // sends the response as text
);

express()
  .get('/', toRequestHandler(hello))
  .get('/getpage/:userid', toRequestHandler(getPage))
  .listen(3000, () =>
    console.log('Express listening on port 3000. Use: GET /'),
  );
