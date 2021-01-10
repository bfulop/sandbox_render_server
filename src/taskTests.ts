import { pipe } from 'fp-ts/es6/function'
import * as T from 'fp-ts/es6/Task'
import * as TE from 'fp-ts/es6/TaskEither'
import * as E from 'fp-ts/es6/Either'

const safeAsync = (what: string): TE.TaskEither<Error, Response> => TE.tryCatch(
  (): Promise<Response> => fetch('https://jsonplaceholder.typicode.com/todos/1' + what),
  E.toError,
)

const parameterStuff = (a:number): T.Task<number> => () => {
  return Promise.resolve(a);
}

const another = (a: number): T.Task<number> => () => {
  return Promise.resolve(a + 2);
}

const oneMore = (a: number): T.Task<number> => () => {
  return Promise.resolve(a + 2);
}

const myflow = pipe(
  T.bindTo('first')(parameterStuff(2)),
  T.bind('second', ({first}) => another(first)),
  T.chain(({second}) => oneMore(second))
)

myflow().then(e => console.log(e))
