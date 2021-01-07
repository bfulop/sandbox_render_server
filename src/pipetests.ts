import { of, Observable } from 'rxjs';
import {
  Decoder,
  success,
  failure,
  literal,
  string,
  sum,
  type,
  number,
  TypeOf,
  union,
} from 'io-ts/es6/Decoder';
import {
  isRight,
  parseJSON,
  toError,
  chain as chainE,
  Json,
  left,
  right,
} from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import type { Either } from 'fp-ts/es6/Either';
import { pipe } from 'fp-ts/es6/function';
import { filterMap, map as mapO } from 'fp-ts-rxjs/es6/Observable';
import type { ObservableEither } from 'fp-ts-rxjs/es6/ObservableEither';
import { map as mapOE } from 'fp-ts-rxjs/es6/ObservableEither';

console.clear();
const mystream = of(
  'a',
  'b',
  3,
  'a',
  5,
  'b',
  'a',
  JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }),
  JSON.stringify({ umbrella: 'potatoes' })
);

type mousemove = {
  type: 'mousemove';
  x: number;
  y: number;
};
type click = {
  type: 'click';
  x: number;
  y: number;
  path: string;
};
export const UserEvents: Decoder<unknown, mousemove | click> = sum('type')({
  mousemove: type({ type: literal('mousemove'), x: number, y: number }),
  click: type({ type: literal('click'), x: number, y: number, path: string }),
});

export type UserEvents = TypeOf<typeof UserEvents>;
type HandledEvents = mousemove | click;

export const SystemEvents: Decoder<
  unknown,
  | {
      type: 'DOMpatched';
    }
  | {
      type: 'listeningToDOMDiffs';
    }
> = sum('type')({
  DOMpatched: type({ type: literal('DOMpatched') }),
  listeningToDOMDiffs: type({ type: literal('listeningToDOMDiffs') }),
});

export const KnownEvent = union(UserEvents, SystemEvents);
export type KnownEvent = TypeOf<typeof KnownEvent>;

const mystring: Decoder<unknown, string> = {
  decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string')),
};

console.log(
  isRight(
    KnownEvent.decode({
      type: 'user',
      event: { type: 'click', x: 1, y: 2, path: 'what' },
    })
  )
); // => true
console.log(
  isRight(UserEvents.decode({ type: 'click', x: 1, y: 2, path: 'what' }))
); // => true
console.log(isRight(mystring.decode(null))); // => false

const doParseJson = (a: string): Either<Error, Json> => parseJSON(a, toError);
const doDecode = (a: Json): Either<Error, HandledEvents> =>
  UserEvents.decode(a);

function isString(text: unknown): Either<Error, string> {
  return typeof text === 'string' ? right(text) : left(Error('not a text'));
}

const jsonToUserEvent = (somejson: string): Either<Error, HandledEvents> =>
  pipe(somejson, doParseJson, chainE(doDecode));
const toUserEvents$ = (
  stream: Observable<unknown>
): ObservableEither<Error, HandledEvents> =>
  pipe(stream, mapO(isString), mapOE(jsonToUserEvent), filterMap(fromEither));

const decodedEvents$ = (
  stream: ObservableEither<Error, HandledEvents>
): Observable<HandledEvents> => pipe(stream, filterMap(fromEither));

export const userEvents$ = (
  stream: Observable<unknown>
): Observable<HandledEvents> => pipe(stream, toUserEvents$, decodedEvents$);

console.clear();
console.log('  ---------------  streampipe  ---------------  ');
pipe(mystream, toUserEvents$, decodedEvents$).subscribe((e) => {
  console.log('****************************************');
  console.log(e);
});
