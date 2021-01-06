import { of } from 'rxjs';
import { filter } from 'rxjs/operators';
import {Decoder, success, failure, literal, string, sum, type, number, TypeOf } from 'io-ts/es6/Decoder'
import { isRight } from 'fp-ts/es6/Either'
import { fromEither } from 'fp-ts/es6/Option';
import { pipe, flow } from 'fp-ts/es6/function';
import { filterMap } from 'fp-ts-rxjs/es6/Observable';

console.clear();
const mystream = of('a', 'b', 'a', 'b', 'a', {type: 'user', event: {type: 'click', x: 1, y: 2, path: 'what'}});
const MyLiteral: Decoder<unknown, 'a'> = literal('a')
const MyBLiteral: Decoder<unknown, 'b'> = literal('b')

const UserEvents: Decoder<
  unknown,
  | {
    type: 'mousemove',
    x: number
    y: number
  }
  | {
    type: 'click',
    x: number
    y: number
    path: string
  }
> = sum('type')({
  mousemove: type({ type: literal('mousemove'), x: number, y: number }),
  click: type({ type: literal('click'), x: number, y: number, path: string })
})

export type UserEvents = TypeOf<typeof UserEvents>

const KnownEvent: Decoder<
  unknown,
  | {
    type: 'system'
    event: string
  }
  | {
    type: 'user'
    event: UserEvents
  }
> = sum('type')({
  system: type({ type: literal('system'), event: string }),
  user: type({ type: literal('user'), event: UserEvents })
})

export const mystring: Decoder<unknown, string> = {
  decode: (u) => (typeof u === 'string' ? success(u) : failure(u, 'string'))
}

console.log(isRight(KnownEvent.decode({type: 'user', event: {type: 'click', x: 1, y: 2, path: 'what'}}))) // => true
console.log(isRight(UserEvents.decode({type: 'click', x: 1, y: 2, path: 'what'}))) // => true
console.log(isRight(mystring.decode(null))) // => false

const filteredStream = mystream.pipe(
  filterMap(flow(
    KnownEvent.decode,
    fromEither
  ))
)
const filteredStreamB = mystream.pipe(
  filterMap(flow(
    MyBLiteral.decode,
    fromEither
  ))
)

console.log('streampipe')
filteredStream.subscribe(a => {
  console.log(a)
})
filteredStreamB.subscribe(a => {
  console.log(a)
})
// console.log(streampipe)


