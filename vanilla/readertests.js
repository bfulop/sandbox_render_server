import { flow } from 'fp-ts/es6/function';
import { of } from 'fp-ts/es6/Task';
import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBASTJ';
import { ask, chain, map, of as ReaderOf } from 'fp-ts/es6/Reader';
import { pipe } from 'fp-ts/es6/pipeable';
console.clear();
const { summon, tagged } = summonFor({});
export const Bicycle = summon(F => F.interface({
    type: F.tag('Bicycle'),
    color: F.string()
}, 'Bicycle'));
export const Car = summon(F => F.interface({
    type: F.tag('Car'),
    kind: F.keysOf({ electric: null, fuel: null, gaz: null }),
    power: F.number()
}, 'Car'));
const Vehicle = tagged('type')({ Car, Bicycle });
const nbSeats = Vehicle.match({
    Car: ({ kind }) => of(kind),
    Bicycle: ({ color }) => of(color),
});
// const myothercar = Vehicle.build({ kind: 'gaz', power: 2, type:'Car' })
// const mycar = Vehicle.as.Car({ kind: 'electric', power: 2 })
// console.log('00000000000000000---------')
// console.log(Car.type)
const workflow = flow(Vehicle.build, nbSeats);
const myresult = workflow({ kind: 'gaz', power: 2, type: 'Car' });
console.log('result is', myresult().then(r => { console.log('aha', r); }));
const i = (b) => (deps) => (b ? deps.foo : "imfalse");
const instance = {
    foo: 'foo',
};
const hAsk = (n) => pipe(ask(), chain(deps => i(!!deps.foo && n)));
// after
const result = pipe(ReaderOf('foo'), map(f), map(g), chain(hAsk)
// chain(b => h(b)),
// chain(hAsk)
);
const pointFreeVersion = flow((a) => ReaderOf(a), map(f), map(g), chain(hAsk));
const meeeyresult = pointFreeVersion('hello')(instance);
const mainworkflow = Vehicle.match({
    Car: ({ kind }) => pointFreeVersion(kind),
    Bicycle: ({ color }) => pointFreeVersion(color),
});
const dowf = flow(Vehicle.build, mainworkflow);
const dowfDone = dowf({ kind: 'gaz', power: 2, type: 'Car' })(instance);
