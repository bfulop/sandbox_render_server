import { of } from 'rxjs';
import { success, failure, literal, string, sum, type, number, union } from 'io-ts/es6/Decoder';
import { isRight, parseJSON, toError } from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import { pipe } from 'fp-ts/es6/function';
import { filterMap, map } from 'fp-ts-rxjs/es6/Observable';
import { map as mapOE } from 'fp-ts-rxjs/es6/ObservableEither';
// import { map } from 'fp-ts-rxjs/es6/ObservableEither'
console.clear();
const mystream = of('a', 'b', 3, 'a', 5, 'b', 'a', JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }));
export const UserEvents = sum('type')({
    mousemove: type({ type: literal('mousemove'), x: number, y: number }),
    click: type({ type: literal('click'), x: number, y: number, path: string })
});
export const SystemEvents = sum('type')({
    DOMpatched: type({ type: literal('DOMpatched') }),
    listeningToDOMDiffs: type({ type: literal('listeningToDOMDiffs') })
});
export const KnownEvent = union(UserEvents, SystemEvents);
const mystring = {
    decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string'))
};
console.log(isRight(KnownEvent.decode({ type: 'user', event: { type: 'click', x: 1, y: 2, path: 'what' } }))); // => true
console.log(isRight(UserEvents.decode({ type: 'click', x: 1, y: 2, path: 'what' }))); // => true
console.log(isRight(mystring.decode(null))); // => false
const doParseJson = (a) => parseJSON(a, toError);
const myresult = number.decode(123);
const resulter = (a) => number.decode(a);
const KnownEvents$ = (astream) => pipe(astream, map(resulter));
const incrementStream = (somestream) => pipe(somestream, mapOE(a => a * 2));
const rightStream = (somestream) => pipe(somestream, filterMap(fromEither));
console.log('streampipe');
pipe(mystream, KnownEvents$, incrementStream, rightStream).subscribe(a => {
    console.log(a);
});
// KnownEvents$(mystream).subscribe(a => {
//   console.log(a)
// })
// filteredStreamB.subscribe(a => {
//   console.log(a)
// })
// console.log(streampipe)
