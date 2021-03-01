import { of, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators'
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
import  { map as mapE } from 'fp-ts/es6/Either';
import type { Either } from 'fp-ts/es6/Either';
import { pipe } from 'fp-ts/es6/function';
import { filterMap, map as mapO } from 'fp-ts-rxjs/es6/Observable';
import type { ObservableEither } from 'fp-ts-rxjs/es6/ObservableEither';
import { map as mapOE, chain as chainOE } from 'fp-ts-rxjs/es6/ObservableEither';

const mystream = of(
  // 'a',
  // 'b',
  // 3,
  // 'a',
  // 5,
  // 'b',
  // 'a',
  JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }),
  JSON.stringify({ umbrella: 'potatoes' }),
  JSON.stringify({ type: 'DOMpatched' })
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

export type UserEvents = mousemove | click;

type DOMpatched = {
  type: 'DOMpatched';
};

type listeningToDOMDiffs = {
  type: 'listeningToDOMDiffs';
};

export type SystemEvents = DOMpatched | listeningToDOMDiffs;

export const SystemEvents: Decoder<
  unknown,
  DOMpatched | listeningToDOMDiffs
> = sum('type')({
  DOMpatched: type({ type: literal('DOMpatched') }),
  listeningToDOMDiffs: type({ type: literal('listeningToDOMDiffs') }),
});

export type HandledEvents = UserEvents | SystemEvents;

export const KnownEvent = union(UserEvents, SystemEvents);
export type KnownEvent = TypeOf<typeof KnownEvent>;

const isString: Decoder<unknown, string> = {
  decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string')),
};

const doParseJson = (a: string): Either<Error, Json> => parseJSON(a, toError);

const decodeKnownEvents = (a: Json): Either<Error, HandledEvents> =>
  KnownEvent.decode(a);

const jsonToKnownEvents = (somejson: string): Either<Error, HandledEvents> =>
  pipe(somejson, doParseJson, chainE(decodeKnownEvents));

export const toKnownEvents$ = (
  stream: Observable<unknown>
): ObservableEither<Error, HandledEvents> =>
  pipe(
    stream,
    mapO((e) => isString.decode(e)),
    mapOE(jsonToKnownEvents),
    filterMap(fromEither)
  );

export const decodedEvents$ = <T>(
  stream: ObservableEither<Error, T>
): Observable<T> => pipe(stream, filterMap(fromEither));

const decodeUserEvents = (
  a: HandledEvents
): Either<Error, UserEvents> =>  UserEvents.decode(a)

export const toUserEvents$ = (
  stream: ObservableEither<Error, HandledEvents>
): ObservableEither<Error, UserEvents> =>
  pipe(
    stream, 
    mapOE(e => decodeUserEvents(e)), 
    filterMap(fromEither)
  );

const decodeSystemEvents = (
  a: HandledEvents
): Either<Error, SystemEvents> =>  SystemEvents.decode(a)

export const toSystemEvents$ = (
  stream: ObservableEither<Error, HandledEvents>
): ObservableEither<Error, SystemEvents> =>
  pipe(
    stream, 
    mapOE(e => decodeSystemEvents(e)), 
    filterMap(fromEither)
  );

export const domPatched$ = (stream: Observable<SystemEvents>): Observable<SystemEvents> => pipe(
  stream,
  filter(e => e.type === 'DOMpatched'),
)

// console.log('  ---------------  streampipe  ---------------  ');
// pipe(mystream, toKnownEvents$, decodedEvents$).subscribe((e) => {
//   console.log('************** Known Event *************');
//   console.log(e);
// });
// pipe(mystream, toKnownEvents$, toUserEvents$, decodedEvents$).subscribe((e) => {
//   console.log('************** User Event *************');
//   console.log(e);
// });
