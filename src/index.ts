import express from 'express';
import { NonEmptyString } from 'io-ts-types/es6/NonEmptyString'
import * as H from 'hyper-ts/es6/index';
import * as t from 'io-ts/es6/index';
import {toRequestHandler} from 'hyper-ts/es6/express';
import {pipe} from 'fp-ts/es6/pipeable';
import * as TE from 'fp-ts/es6/TaskEither'
import * as E from 'fp-ts/es6/Either'

const UserId = NonEmptyString

type UserId = NonEmptyString

const UserNotFound: 'UserNotFound' = 'UserNotFound'

const InvalidArguments: 'InvalidArguments' = 'InvalidArguments'

type UserError = typeof InvalidArguments | typeof UserNotFound

// const decodeParamsMiddleware = H.decodeQuery(
//   t.strict({
//     pageUrl: t.string,
//   })
// ).decode

// function badRequest(message: Error) {
//  return pipe(
//    H.status(H.Status.BadRequest),
//    H.ichain(() => H.closeHeaders()),
//    H.ichain(() => H.send(message.message))
//  )
// }

// function addTwo(a:number, b:number) {
//   return a + b;
// }

// addTwo('one', 'two')

// returns a middleware validating `req.param.user_id`
// const decodeuserid = pipe(
//   H.decodeParam('userid', t.string.decode),
//   H.mapLeft(() => new Error('not could decode'))
// );
//
// const doAPIWork = (id:string) =>
//  H.fromTaskEither(TE.tryCatch(() =>
//    Promise.resolve(id), E.toError ))


function sendPage () {
  return pipe(
    H.status(H.Status.OK),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send(`hello `))
  )
}

/** Parses the `user_id` param */
const getUserId = pipe(
  H.decodeParam('user_id', UserId.decode),
  H.mapLeft(() => InvalidArguments)
)

const getPage = sendPage;

// const getPage = pipe(
//   getUserId,
//   H.ichain(() => sendPage)
//   // pipe((user) => pipe(
//   //   H.ichain(() => sendPage(user))
//   // ))
// )

// const getPage: H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> = pipe(
//   decodeuserid,
//   H.ichain((id) => doAPIWork(id)),
//   H.ichain(userId =>
//     pipe(
//       H.status(H.Status.OK), // writes the response status
//       // H.ichain(() => H.json({myuser: userId}, E.toError))
//       H.ichain(() => H.closeHeaders()), // tells hyper-ts that we're done with the headers
//       H.ichain(() => H.send(`Hello hyper-ts on express! userid: ${userId}`)), // sends the response as text
//     ),
//   ),
//   H.orElse(badRequest)
// );

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
