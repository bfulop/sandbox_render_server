import express from 'express'
import * as E from 'fp-ts/es6/Either'
import { pipe } from 'fp-ts/es6/function'
import * as t from 'io-ts/es6/index'
import * as H from 'hyper-ts/es6/index'
import { toRequestHandler } from 'hyper-ts/es6/express'
import { summonFor } from '@morphic-ts/batteries/lib/summoner-BASTJ'

const { summon } = summonFor<{}>({}) // Necessary to Specify the config environment (see Config Environment)

const Person = summon(F =>
  F.interface(
    {
      name: F.string(),
      age: F.number()
    },
    'Person'
  )
)
console.log(Person);


// return a middleware validating the query "order=desc&shoe[color]=blue&shoe[type]=converse"
const decodePageQuery: H.Middleware<H.StatusOpen, H.StatusOpen, string, {pageid: string}> = pipe(
  H.decodeQuery( t.strict({ pageid: t.string, }).decode),
  H.mapLeft(() => 'what')
)

const decodeUser: H.Middleware<H.StatusOpen, H.StatusOpen, string, string> = pipe(
  H.decodeParam('user_id', t.string.decode),
  H.mapLeft(() => 'what')
);

function badRequest(message: string): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> {
  return pipe(
    H.status(H.Status.BadRequest),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.send(message))
  )
}

const hello = pipe(
  decodePageQuery,
  H.ichain(({ pageid }) =>
    pipe(
      H.status<string>(H.Status.OK),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.send(`Hello ${pageid}!`))
    )
  ),
  H.orElse(badRequest)
)

const app = express()

app
  .get('/getpage', toRequestHandler(hello))
  // tslint:disable-next-line: no-console
  .listen(3000, () => console.log('Express listening on port 3000. Use: POST /'))
