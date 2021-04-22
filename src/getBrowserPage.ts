import { fromNullable } from 'fp-ts/es6/Either';
import { pipe } from 'fp-ts/es6/function';
import * as T from 'fp-ts/es6/Task';
import * as TE from 'fp-ts/es6/TaskEither';
import type {
  Browser,
  BrowserContext,
  Page,
  Response,
} from 'playwright/types/types';
import { cleanHTML } from './processHTML';

const getContext = (b: Browser): T.Task<BrowserContext> => () => {
  return b.newContext({
    viewport: { width: 680, height: 860 },
  });
};

const getNewPage = (c: BrowserContext): T.Task<Page> => () => {
  return c.newPage();
};

const loadUrl = (p: Page): ((a: string) => T.Task<Response | null>) => (
  url: string
) => () => {
  return p.goto(url);
};

export type DOMString = string;

export const getPageContent = (p: Page): T.Task<DOMString> => () => {
  return p.content().then(s => cleanHTML(s)());
}

const navigateToPage = (
  p: Page
): ((u: string) => TE.TaskEither<string, Response>) => (url: string) =>
  pipe(loadUrl(p)(url), T.map(fromNullable('cant load page')));

export const getPage = (browser: Browser) => (url: string) =>
  pipe(
    T.bindTo('context')(getContext(browser)),
    T.bind('page', ({ context }) => getNewPage(context)),
    TE.fromTask,
    TE.bind('loadedPage', ({ page }) => navigateToPage(page)(url)),
    TE.bind('DOMstring', ( {page }) => pipe(page, getPageContent, TE.fromTask))
  );
