import * as ws from 'ws';
import express from 'express'
import * as E from 'fp-ts/es6/Either'
import { pipe } from 'fp-ts/es6/pipeable'
import * as t from 'io-ts/es6/index'
import * as H from 'hyper-ts/es6/index'
import { toRequestHandler } from 'hyper-ts/es6/express'

interface pageRequest {
  url: string
}

interface gotPage {
  id: number,
  dom: string
}

function *server(stuff: string): Generator<number, void, string> {
  const decodeUser: H.Middleware<
    H.StatusOpen,
    H.StatusOpen,
    string,
    string
  > = pipe(
    H.decodeParam('user_id', t.string.decode),
    H.mapLeft(() => 'what')
  );

  function badRequest(
    message: string
  ): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> {
    return pipe(
      H.status(H.Status.BadRequest),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.send(message))
    );
  }

  const hello = pipe(
    decodeUser,
    H.ichain((name) =>
      pipe(
        H.status<string>(H.Status.OK),
        H.ichain(() => H.closeHeaders()),
        H.ichain(() => H.send(`Hello ${name}!`))
      )
    ),
    H.orElse(badRequest)
  );
  
  const myres = yield 3;

  const app = express();
  app
    // .get('/getpage/:user_id', toRequestHandler(hello))
    .get('/getpage', function getApage(req, res){
        res.send(stuff);
    })
    // tslint:disable-next-line: no-console
    .listen(3000, () =>
      console.log('Express listening on port 3000. Use: POST /')
    );
}


function main(httpserver: (a: string) => Generator<number, void, string>) {
  let connections = {};
  const startserver = httpserver('dunno');
  let server

  do {
    console.log('need to do my workflow');
    server = startserver.next('a')
    var myres = server.value
  } while(!server.done)
}

main(server)
