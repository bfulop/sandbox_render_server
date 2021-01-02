import { makeADT, ofType } from "@morphic-ts/adt";
export const ClientState = makeADT('type')({
    Started: ofType(),
    Requested: ofType(),
    Loading: ofType(),
    LoadError: ofType(),
    Loaded: ofType(),
    UIRequest: ofType(),
    UIRequestDone: ofType(),
    UIRequestPatched: ofType(),
    Disconnected: ofType(),
    Stale: ofType(),
});
