import { of } from 'rxjs';
import { success, failure, literal, string, sum, type, number } from 'io-ts/es6/Decoder';
import { isRight } from 'fp-ts/es6/Either';
import { fromEither } from 'fp-ts/es6/Option';
import { flow } from 'fp-ts/es6/function';
import { filterMap } from 'fp-ts-rxjs/es6/Observable';
console.clear();
const mystream = of('a', 'b', 'a', 'b', 'a', { type: 'user', event: { type: 'click', x: 1, y: 2, path: 'what' } });
const MyLiteral = literal('a');
const MyBLiteral = literal('b');
const UserEvents = sum('type')({
    mousemove: type({ type: literal('mousemove'), x: number, y: number }),
    click: type({ type: literal('click'), x: number, y: number, path: string })
});
const KnownEvent = sum('type')({
    system: type({ type: literal('system'), event: string }),
    user: type({ type: literal('user'), event: UserEvents })
});
export const mystring = {
    decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string'))
};
console.log(isRight(KnownEvent.decode({ type: 'user', event: { type: 'click', x: 1, y: 2, path: 'what' } }))); // => true
console.log(isRight(UserEvents.decode({ type: 'click', x: 1, y: 2, path: 'what' }))); // => true
console.log(isRight(mystring.decode(null))); // => false
const filteredStream = mystream.pipe(filterMap(flow(KnownEvent.decode, fromEither)));
const filteredStreamB = mystream.pipe(filterMap(flow(MyBLiteral.decode, fromEither)));
console.log('streampipe');
filteredStream.subscribe(a => {
    console.log(a);
});
filteredStreamB.subscribe(a => {
    console.log(a);
});
// console.log(streampipe)
