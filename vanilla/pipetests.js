import { of } from 'rxjs';
import { success, failure, literal, string, sum, type, number, union } from 'io-ts/es6/Decoder';
import { isRight, parseJSON, toError, chain } from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import { pipe, flow } from 'fp-ts/es6/function';
import { filterMap } from 'fp-ts-rxjs/es6/Observable';
console.clear();
const mystream = of('a', 'b', 'a', 'b', 'a', JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }));
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
export const KnownEvents$ = pipe(filterMap(flow(doParseJson, chain(KnownEvent.decode), fromEither)));
console.log('streampipe');
KnownEvents$(mystream).subscribe(a => {
    console.log(a);
});
// filteredStreamB.subscribe(a => {
//   console.log(a)
// })
// console.log(streampipe)
