import express from 'express'
import * as H from 'hyper-ts/es6/index'
import { toRequestHandler } from 'hyper-ts/es6/express'
import { pipe } from 'fp-ts/es6/pipeable'

const hello: H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> = pipe(
  H.status(H.Status.OK), // writes the response status
  H.ichain(() => H.closeHeaders()), // tells hyper-ts that we're done with the headers
  H.ichain(() => H.send('Hello hyper-ts on express!')) // sends the response as text
)

express()
  .get('/', toRequestHandler(hello))
  .listen(3000, () => console.log('Express listening on port 3000. Use: GET /'))
