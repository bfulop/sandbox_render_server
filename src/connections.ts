import { IO } from 'fp-ts/es6/IO';
import { fromNullable, Option } from 'fp-ts/es6/Option';
import { UUID } from 'io-ts-types';
import { v4 as uuidv4 } from 'uuid';
import type { BrowserContext, Page, Response } from 'playwright/types/types';

const connections = new Map();

export type aConncection = {
  page: Page;
  loadedPage: Response;
  DOMstring: string;
  context: BrowserContext;
};

export const addClient = (clientContext: aConncection): IO<{id: UUID, DOMString: string}> => () => {
  const id = uuidv4() as UUID;
  connections.set(id, clientContext);
  return {id, DOMString: clientContext.DOMstring};
};

export const getClient = (id: UUID): IO<Option<aConncection>> => () =>
  fromNullable(connections.get(id));
