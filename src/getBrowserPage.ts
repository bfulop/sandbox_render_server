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
import type { pageOpenParams } from './index'

const getContext = (b: Browser) => (params:pageOpenParams): T.Task<BrowserContext> => () => {
  return b.newContext({
    viewport: { width: params.window.width, height: params.window.height },
  });
};

const getNewPage = (c: BrowserContext): T.Task<Page> => () => {
  return c.newPage();
};

const loadUrl = (p: Page): ((a: pageOpenParams) => T.Task<Response | null>) => (
  url: pageOpenParams
) => () => {
  return p.goto(url.url);
};

export type DOMString = string;

export const getPageContent = (p: Page): T.Task<DOMString> => () => {
  return p.content();
}

const navigateToPage = (
  p: Page
): ((u: pageOpenParams) => TE.TaskEither<string, Response>) => (url: pageOpenParams) =>
  pipe(loadUrl(p)(url), T.map(fromNullable('cant load page')));

export const getPage = (browser: Browser) => (url: pageOpenParams) =>
  pipe(
    T.bindTo('context')(getContext(browser)(url)),
    T.bind('page', ({ context }) => getNewPage(context)),
    TE.fromTask,
    TE.bind('loadedPage', ({ page }) => navigateToPage(page)(url)),
    TE.bind('DOMstring', ( {page }) => pipe(page, getPageContent, TE.fromTask))
  );
