import { of } from 'rxjs';
import { success, failure, literal, string, sum, type, number, union, } from 'io-ts/es6/Decoder';
import { isRight, parseJSON, toError, chain as chainE, left, right, } from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import { pipe } from 'fp-ts/es6/function';
import { filterMap, map as mapO } from 'fp-ts-rxjs/es6/Observable';
import { map as mapOE } from 'fp-ts-rxjs/es6/ObservableEither';
const mystream = of('a', 'b', 3, 'a', 5, 'b', 'a', JSON.stringify({ type: 'click', x: 1, y: 2, path: 'what' }), JSON.stringify({ umbrella: 'potatoes' }));
export const UserEvents = sum('type')({
    mousemove: type({ type: literal('mousemove'), x: number, y: number }),
    click: type({ type: literal('click'), x: number, y: number, path: string }),
});
export const SystemEvents = sum('type')({
    DOMpatched: type({ type: literal('DOMpatched') }),
    listeningToDOMDiffs: type({ type: literal('listeningToDOMDiffs') }),
});
export const KnownEvent = union(UserEvents, SystemEvents);
const mystring = {
    decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string')),
};
console.log(isRight(KnownEvent.decode({
    type: 'user',
    event: { type: 'click', x: 1, y: 2, path: 'what' },
}))); // => true
console.log(isRight(UserEvents.decode({ type: 'click', x: 1, y: 2, path: 'what' }))); // => true
console.log(isRight(mystring.decode(null))); // => false
const doParseJson = (a) => parseJSON(a, toError);
const doDecode = (a) => UserEvents.decode(a);
function isString(text) {
    return typeof text === 'string' ? right(text) : left(Error('not a text'));
}
const jsonToUserEvent = (somejson) => pipe(somejson, doParseJson, chainE(doDecode));
const toUserEvents$ = (stream) => pipe(stream, mapO(isString), mapOE(jsonToUserEvent), filterMap(fromEither));
const decodedEvents$ = (stream) => pipe(stream, filterMap(fromEither));
export const userEvents$ = (stream) => pipe(stream, toUserEvents$, decodedEvents$);
console.clear();
console.log('  ---------------  streampipe  ---------------  ');
pipe(mystream, toUserEvents$, decodedEvents$).subscribe((e) => {
    console.log('****************************************');
    console.log(e);
});
