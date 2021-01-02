import { flow } from 'fp-ts/es6/function';
import { of } from 'fp-ts/es6/Task';
import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBASTJ'
import { Reader, ask, chain, map, of as ReaderOf } from 'fp-ts/es6/Reader'
import { pipe } from 'fp-ts/es6/pipeable'
import * as E from 'fp-ts/lib/Either'
import * as RE from 'fp-ts/lib/ReaderEither'

console.clear();

const { summon, tagged } = summonFor<{}>({})

export const Bicycle = summon(F =>
  F.interface(
    {
      type: F.tag('Bicycle'),
      color: F.string()
    },
    'Bicycle'
  )
)

export const Car = summon(F =>
  F.interface(
    {
      type: F.tag('Car'),
      kind: F.keysOf({ electric: null, fuel: null, gaz: null }),
      power: F.number()
    },
    'Car'
  )
)

const Vehicle = tagged('type')({ Car, Bicycle })

const nbSeats = Vehicle.match({
  Car: ({ kind }) => of(kind),
  Bicycle: ({ color }) => of(color),
})
// const myothercar = Vehicle.build({ kind: 'gaz', power: 2, type:'Car' })

// const mycar = Vehicle.as.Car({ kind: 'electric', power: 2 })
// console.log('00000000000000000---------')
// console.log(Car.type)

const workflow = flow(
  Vehicle.build,
  nbSeats
)

const myresult = workflow({ kind: 'gaz', power: 2, type: 'Car' });

console.log('result is', myresult().then(r => {console.log('aha', r)}))


// export interface Dependencies {
//   i18n: {
//     true: string
//     false: string
//   }
//   lowerBound: number
// }
//
// const instance: Dependencies = {
//   i18n: {
//     true: 'vero',
//     false: 'falso'
//   },
//   lowerBound: 2
// }
// const f = (b: boolean): Reader<Dependencies, string> => deps => (b ? deps.i18n.true : deps.i18n.false)
//
// const g = (n: number): Reader<Dependencies, string> =>
//   pipe(
//     ask<Dependencies>(),
//     chain(deps => f(n > deps.lowerBound))
//   )
//
//
// const h = (s: string): Reader<Dependencies, string> => g(s.length + 1)
// console.log('---9999-----')
//
// console.log(h('foo')(instance)) // 'vero'
// console.log(h('foo')({ ...instance, lowerBound: 4 })) // 'falso'

// const f = (b: boolean): ((deps: Dependencies) => string) => deps => (b ? deps.i18n.true : deps.i18n.false)
//
// const g = (n: number): boolean => (n > 2)
//
// const h = (s: string): number => (s.length + 1)
//
// const myworkflow = flow(
//   h,
//   map(g),
//   chain(b => f(b))
// )
//
// console.log('myflow', myworkflow('hello')(instance))

// declare function f(s: string): E.Either<Error, number>
declare function g(n: number): boolean
declare function h(b: boolean): Reader<Dependencies, number>
const i = (b: boolean) => (deps: Dependencies) => (b ? deps.foo : "imfalse")

// composing `f`, `g`, and `h` -------------v---------v-----------v
// const resultold = pipe(E.right('foo'), E.chain(f), E.map(g), E.chain(h))
//
// const pointFreeVersionold = flow(f, E.map(g), E.chain(h))

interface Dependencies {
  foo: string
}
const instance:Dependencies = {
  foo: 'foo',
}

const hAsk = (n:boolean): Reader<Dependencies, string> =>
  pipe(
    ask<Dependencies>(),
    chain(deps => i(!!deps.foo && n))
  )

declare function f(s: string): number

// after
const result = pipe(
  ReaderOf('foo'),
  map(f),
  map(g),
  chain(hAsk)
  // chain(b => h(b)),
  // chain(hAsk)
)

const pointFreeVersion = flow(
  (a: string) => ReaderOf<Dependencies, string>(a),
  map(f),
  map(g),
  chain(hAsk)
)

const meeeyresult = pointFreeVersion('hello')(instance)

const mainworkflow = Vehicle.match({
  Car: ({ kind }) => pointFreeVersion(kind),
  Bicycle: ({ color }) => pointFreeVersion(color),
})

const dowf = flow(
  Vehicle.build,
  mainworkflow
)

const dowfDone = dowf({ kind: 'gaz', power: 2, type: 'Car' })(instance);
