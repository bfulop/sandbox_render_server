import { of } from 'rxjs';
import { success, failure, literal, string, sum, type, number, union, } from 'io-ts/es6/Decoder';
import { parseJSON, toError, chain as chainE, } from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import { pipe } from 'fp-ts/es6/function';
import { filterMap, map as mapO } from 'fp-ts-rxjs/es6/Observable';
import { map as mapOE } from 'fp-ts-rxjs/es6/ObservableEither';
console.clear();
const mystream = of('a', 'b', 3, 'a', 5, 'b', 'a', JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }), JSON.stringify({ umbrella: 'potatoes' }), JSON.stringify({ type: 'DOMpatched' }));
export const UserEvents = sum('type')({
    mousemove: type({ type: literal('mousemove'), x: number, y: number }),
    click: type({ type: literal('click'), x: number, y: number, path: string }),
});
export const SystemEvents = sum('type')({
    DOMpatched: type({ type: literal('DOMpatched') }),
    listeningToDOMDiffs: type({ type: literal('listeningToDOMDiffs') }),
});
export const KnownEvent = union(UserEvents, SystemEvents);
const isString = {
    decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string')),
};
const doParseJson = (a) => parseJSON(a, toError);
const decodeKnownEvents = (a) => KnownEvent.decode(a);
const jsonToKnownEvents = (somejson) => pipe(somejson, doParseJson, chainE(decodeKnownEvents));
export const toKnownEvents$ = (stream) => pipe(stream, mapO((e) => isString.decode(e)), mapOE(jsonToKnownEvents), filterMap(fromEither));
export const decodedEvents$ = (stream) => pipe(stream, filterMap(fromEither));
// export const knowEvents$ = (
//   stream: Observable<unknown>
// ): Observable<HandledEvents> => pipe(stream, toKnownEvents$, decodedEvents$);
const decodeUserEvents = (a) => UserEvents.decode(a);
export const toUserEvents$ = (stream) => pipe(stream, mapOE(e => decodeUserEvents(e)), filterMap(fromEither));
const decodeSystemEvents = (a) => UserEvents.decode(a);
export const toSystemEvents$ = (stream) => pipe(stream, mapOE(e => decodeSystemEvents(e)), filterMap(fromEither));
console.log('  ---------------  streampipe  ---------------  ');
pipe(mystream, toKnownEvents$, decodedEvents$).subscribe((e) => {
    console.log('************** Known Event *************');
    console.log(e);
});
pipe(mystream, toKnownEvents$, toUserEvents$, decodedEvents$).subscribe((e) => {
    console.log('************** User Event *************');
    console.log(e);
});
