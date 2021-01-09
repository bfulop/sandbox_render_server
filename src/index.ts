import express from 'express'
import * as E from 'fp-ts/es6/Either'
import { pipe } from 'fp-ts/es6/function'
import * as t from 'io-ts/es6/index'
import * as H from 'hyper-ts/es6/index'
import * as TE from 'fp-ts/es6/TaskEither'
import { toRequestHandler } from 'hyper-ts/es6/express'
import { IntFromString } from 'io-ts-types/lib/IntFromString'

const connections = new Map();

// return a middleware validating the query "order=desc&shoe[color]=blue&shoe[type]=converse"
const decodePageQuery: H.Middleware<H.StatusOpen, H.StatusOpen, string, {pageid: string}> = pipe(
  H.decodeQuery( t.strict({ pageid: t.string, }).decode),
  H.mapLeft(() => 'cannotdecode')
)

const paramDecode = pipe(
 H.decodeParam('question_id', IntFromString.decode),
)

const someTask = () => TE.of('mySomeTask');


const safeAsync = (apageid:string):TE.TaskEither<string, {  second:string}> => TE.tryCatch(
  (): Promise<{second:string}> => Promise.resolve({ second: apageid + 'second'}),
  () => 'eerr',
)

const doAPIWork = (pageid: string) => H.fromTaskEither(safeAsync(pageid))

const decodeUser: H.Middleware<H.StatusOpen, H.StatusOpen, string, string> = pipe(
  H.decodeParam('user_id', t.string.decode),
  H.mapLeft(() => 'what')
);

function badRequest(message: string): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> {
  return pipe(
    H.status(H.Status.BadRequest),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send('bad request ' + message))
  )
}

const hello = pipe(
  decodePageQuery,
  H.chain(({pageid}) => doAPIWork(pageid)),
  H.ichain(({second}) =>
    pipe(
      H.status<string>(H.Status.OK),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.send(`Hello decoded, ${second}`))
    )
  ),
  H.orElse(badRequest)
)

const app = express()

app
  .get('/getpage', toRequestHandler(hello))
  // tslint:disable-next-line: no-console
  .listen(3000, () => console.log('Express listening on port 3000. Use: POST /'))
