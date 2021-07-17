import * as parse5 from 'parse5';
import type { CommentNode } from 'parse5';
import * as Decoder  from 'io-ts/lib/Decoder';
import { io as IO, tree as Tree, either as E, array as A, option as O } from 'fp-ts';
import * as MO from 'monocle-ts';
import { function as F } from 'fp-ts';
import * as treeAdaptor from './libs/tree-adapter-custom.js';
import type { DOMString } from './getBrowserPage';

const parseDOMStringWithoutScripts = (d: string): IO.IO<parse5.Document> => () => {
  return parse5.parse(d, {treeAdapter: treeAdaptor});
};

const html =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="next-head-count" content="2"><noscript data-n-css=""></noscript><link rel="preload" href="/_next/static/chunks/main.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/webpack.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/_app.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703" as="script"><noscript id="__next_css__DO_NOT_USE__"></noscript><script charset="utf-8" src="/_next/static/chunks/0.js"></script></head><body><script src="/crashme.js">console.log("hello crahs")</script><div id="__next"><div><h1>Test Page</h1><p>The counter is: <!-- -->0</p></div></div><script src="/_next/static/chunks/react-refresh.js?ts=1610693370703"></script><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"/thirdpage","query":{},"buildId":"development","nextExport":true,"autoExport":true,"isFallback":false}</script><script nomodule="" src="/_next/static/chunks/polyfills.js?ts=1610693370703"></script><script src="/_next/static/chunks/main.js?ts=1610693370703"></script><script src="/_next/static/chunks/webpack.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/_app.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703"></script><div id="__next-build-watcher" style="position: fixed; bottom: 10px; right: 20px; width: 0px; height: 0px; z-index: 99999;"></div><script src="/_next/static/development/_buildManifest.js?ts=1610693370703"></script><script src="/_next/static/development/_ssgManifest.js?ts=1610693370703"></script></body></html>';

const htmlsimple = '<!DOCTYPE html><html><head></head><body><script>runCrash()</script>some text<!-- some comment --><p>Im just some<br /> text</p><script src="ugly.js">console.log("crashme");</script><h1 class="header">hello world!</h1></body></html>'


const parsed = parseDOMStringWithoutScripts(htmlsimple)();

export const cleanHTML = (d: DOMString): IO.IO<DOMString> => () => F.pipe(
  d,
  parseDOMStringWithoutScripts,
  s => parse5.serialize(s())
)


console.log('----- the result ------');
console.log(parse5.serialize(parsed));
