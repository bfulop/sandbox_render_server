import { flow, pipe } from 'fp-ts/es6/function';
import * as T from 'fp-ts/es6/Task';
import * as TE from 'fp-ts/es6/TaskEither';
import * as E from 'fp-ts/es6/Either';
import { reader as R, readerTask as RT, readerEither as RE } from 'fp-ts';

const safeAsync = (what: string): TE.TaskEither<Error, Response> =>
  TE.tryCatch(
    (): Promise<Response> =>
      fetch('https://jsonplaceholder.typicode.com/todos/1' + what),
    E.toError
  );

const parameterStuff = (a: number): T.Task<number> => () => {
  return Promise.resolve(a);
};

const another = (a: number): T.Task<number> => () => {
  return Promise.resolve(a + 2);
};

const oneMore = (a: number): T.Task<number> => () => {
  return Promise.resolve(a + 2);
};

const myflow = pipe(
  T.bindTo('first')(parameterStuff(2)),
  T.bind('second', ({ first }) => another(first)),
  T.chain(({ second }) => oneMore(second))
);

myflow().then((e) => console.log(e));

interface ClientStuff {
  client: number;
  page: string;
}

const addTwo = (a: number): R.Reader<ClientStuff, number> => (
  b: ClientStuff
) => {
  return a + b.client;
};

const addTwoTask = (a: number): RT.ReaderTask<ClientStuff, number> => (
  b: ClientStuff
) => {
  const result = a + b.client;
  return T.of(result);
};

const readTest = (n: number): R.Reader<ClientStuff, number> =>
  pipe(
    () => 2,
    R.chain((e) => addTwo(e)),
    R.map((a) => 2 + a),
    R.chain((a) => (b) => a + b.client),
    R.chain(addTwo),
    // RT.fromReader,
    // RT.chain(addTwoTask),
    // RT.map((a) => a + 32)
  );
const myresult = readTest(2)({ client: 2, page: 'hello' });
// myresult().then((a) => {
//   console.log('myresult is', a);
// });

const myeitherStuff = (n: number): E.Either<string, number> => {
  return n > 2 ? E.right(n) : E.left('too small');
};

const addTwoE = (a: number): R.Reader<ClientStuff, number> => (
  b: ClientStuff
) => a + b.client;

const readerEitherWorkflow = (
  n: number
): RE.ReaderEither<ClientStuff, string, number> =>
  pipe(
    myeitherStuff(n),
    RE.fromEither,
    // RE.chain(a => b => E.of(2)),
    RE.chain((a) => R.asks((b) => E.of(addTwo(a)(b))))
    // RE.map((a) => 2 + a),
    // RE.chain(a => b => a + b.client)
    // RE.right(a => addTwoE(a))
    // E.map(a => b => a + b.client)
  );

const myresult2 = readerEitherWorkflow(3)({ client: 100, page: 'hello' });
console.log('myres2', myresult2);
