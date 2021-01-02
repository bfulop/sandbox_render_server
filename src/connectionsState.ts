import { makeADT, ofType } from "@morphic-ts/adt";

interface Started {
  type: 'Started'
  id: number
}

interface Requested {
  type: 'Requested'
  id: number
  url: string
}

interface Loading {
  type: 'Loading'
  id: number
  url: string
}

interface LoadError {
  type: 'LoadError'
  id: number
  url: string
}

interface Loaded {
  type: 'Loaded'
  id: number
  url: string
  html: string
}

interface UIRequest {
  type: 'UIRequest'
  id: number
  url: string
  html: string
}

interface UIRequestDone {
  type: 'UIRequestDone'
  id: number
  url: string
  html: string
  newhtml: string
  patch: string
}

interface UIRequestPatched {
  type: 'UIRequestPatched'
  id: number
  url: string
  html: string
}

interface Disconnected {
  type: 'Disconnected'
  id: number
  url: string
  html: string
}

interface Stale {
  type: 'Stale'
  id: number
  url: string
  html: string
}

export const ClientState = makeADT('type')({
  Started: ofType<Started>(),
  Requested: ofType<Requested>(),
  Loading: ofType<Loading>(),
  LoadError: ofType<LoadError>(),
  Loaded: ofType<Loaded>(),
  UIRequest: ofType<UIRequest>(),
  UIRequestDone: ofType<UIRequestDone>(),
  UIRequestPatched: ofType<UIRequestPatched>(),
  Disconnected: ofType<Disconnected>(),
  Stale: ofType<Stale>(),
})
