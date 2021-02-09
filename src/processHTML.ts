import * as parse5 from 'parse5';
import type { CommentNode } from 'parse5';
import * as Decoder  from 'io-ts/es6/Decoder';
import { io as IO, tree as Tree, either as E, array as A, option as O } from 'fp-ts';
import * as MO from 'monocle-ts';
import { pipe, identity } from 'fp-ts/es6/function';
import * as treeAdaptor from './libs/tree-adapter-custom.js';

console.clear();

const parseDOMStringWithoutScripts = (d: string): IO.IO<parse5.Document> => () => {
  return parse5.parse(d, {treeAdapter: treeAdaptor});
};

const html =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="next-head-count" content="2"><noscript data-n-css=""></noscript><link rel="preload" href="/_next/static/chunks/main.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/webpack.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/_app.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703" as="script"><noscript id="__next_css__DO_NOT_USE__"></noscript><script charset="utf-8" src="/_next/static/chunks/0.js"></script></head><body><script src="/crashme.js">console.log("hello crahs")</script><div id="__next"><div><h1>Test Page</h1><p>The counter is: <!-- -->0</p></div></div><script src="/_next/static/chunks/react-refresh.js?ts=1610693370703"></script><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"/thirdpage","query":{},"buildId":"development","nextExport":true,"autoExport":true,"isFallback":false}</script><script nomodule="" src="/_next/static/chunks/polyfills.js?ts=1610693370703"></script><script src="/_next/static/chunks/main.js?ts=1610693370703"></script><script src="/_next/static/chunks/webpack.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/_app.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703"></script><div id="__next-build-watcher" style="position: fixed; bottom: 10px; right: 20px; width: 0px; height: 0px; z-index: 99999;"></div><script src="/_next/static/development/_buildManifest.js?ts=1610693370703"></script><script src="/_next/static/development/_ssgManifest.js?ts=1610693370703"></script></body></html>';

const htmlsimple = '<!DOCTYPE html><html><head></head><body><script>runCrash()</script>some text<!-- some comment --><p>Im just some<br /> text</p><script src="ugly.js"></script><h1 class="header">hello world!</h1></body></html>'

const someChildNodes = (a: parse5.Node) => {
  if ('childNodes' in a) {
    return a.childNodes;
  } else {
    return [];
  }
};

export const cleanScripts = (d: string): IO.IO<string> => () => {
  return pipe(
    parseDOMStringWithoutScripts(d)(),
    e => parse5.serialize(e));
};

const parsed = parseDOMStringWithoutScripts(htmlsimple)();

const mytree = Tree.unfoldTree(parsed.childNodes[1], (x) => [
  x,
  someChildNodes(x),
]);

type SrcAttribute = {
  name: 'src';
  value: string;
};

type ScriptTag = parse5.Element & { nodeName: 'script' }

const attributes: MO.Traversal<
  parse5.Attribute[],
  parse5.Attribute
> = MO.fromTraversable(A.array)<parse5.Attribute>();

const isSrc = (a: parse5.Attribute): a is SrcAttribute => {
  return a.name === 'src';
};

const justSrcs: MO.Traversal<
  parse5.Attribute[],
  SrcAttribute
> = attributes.composePrism(MO.Prism.fromPredicate(isSrc));

const isScriptTag = (a: parse5.Element): a is ScriptTag => {
  return a.nodeName === 'script';
}

// ------------- Decode parse5 node types -----------------
// what exactly do I want to do here?
// actually sending string diffs is more efficient and 
// doing all this in the client requires less CPU for us, and globally more efficient
// because it's less data so send text diffs than json tree diffs
// so it's the client that parses the string, creates the Tree
// then diffs the last tree, creates the tree diff and patches the DOM
//
// ---------- So then what do I want to do on the client ? ------------
// I have a parse5 tree, and the leaves are DocumentNode | ChildNode | TextNode etc
// I want to
// 1. change script srcs and contents
// 2. rewrite img src and link srcs
// 3. convert it to a simpler tree
// 4. on first run add all this to the DOM, let's do it in an iframe
// so here, the simplest is just to convert it back to a string with parse5 and overwrite the dom
// 5. on later updates, convert it to a simpler tree, diff it, and patch the DOM
//
// ----------- The technical implementation ------------
// questions: can parse5 parse a simplified tree?
// if so, I can "convert early" ie do the pattern matching etc
// or, just remove the parentNodes before the json diffing

const isTextNode = (a: parse5.Node): a is parse5.TextNode => a.nodeName === '#text';
const isCommentNode = (a: parse5.Node): a is parse5.CommentNode => a.nodeName === '#comment';
const isDocumentNode = (a: parse5.Node): a is parse5.Document => a.nodeName === '#document';
const isDocumentTypeNode = (a: parse5.Node): a is parse5.DocumentType => a.nodeName === '#documentType';

const textNode: Decoder.Decoder<parse5.ChildNode, parse5.TextNode> = {
  decode: (u) => u.nodeName === '#text'
}
const commentNode: Decoder.Decoder<parse5.ChildNode, parse5.CommentNode> = {
  decode: (u) => u.nodeName === '#comment'
}
const documentNode: Decoder.Decoder<parse5.Node, parse5.Document> = {
  decode: (u) => u.nodeName === '#document'
}
const documentTypeNode: Decoder.Decoder<parse5.Node, parse5.DocumentType> = {
  decode: (u) => u.nodeName === '#documentType'
}
const elementNode: Decoder.Decoder<parse5.ChildNode, parse5.Element> = {
  decode: (u) => 'childNodes' in u
}
const childNode = Decoder.union(textNode, elementNode, commentNode);

const ATextNode = Decoder.type({
  nodeName: Decoder.literal('#text'),
  value: Decoder.string
})
const ACommentNode = Decoder.type({
  nodeName: Decoder.literal('#comment'),
  value: Decoder.string
})
const AnAttribute = Decoder.type({
  name: Decoder.string,
  value: Decoder.string
})
const AnElementNode: Decoder.Decoder<parse5.ChildNode, {nodeName: string}> = Decoder.type({
  nodeName: Decoder.string,
})

const theAtributes = MO.Lens.fromProp<ScriptTag>()('attrs'); 

const theValue = MO.Lens.fromProp<SrcAttribute>()('value'); 

const nodeElement = new MO.Prism<parse5.ChildNode, parse5.Element>(
  (s) => ('childNodes' in s ? O.some(s): O.none),
  identity
)

const scriptElement = new MO.Prism<parse5.Element, ScriptTag>(
  (s) => (isScriptTag(s) ? O.some(s): O.none),
  identity
)

const theScriptTags = nodeElement.composePrism(scriptElement).composeLens(theAtributes).composeTraversal(justSrcs).composeLens(theValue);
const newScriptAttr = theScriptTags.modify(() => '')

// -------------------------------------------------------------------------------

const DOMTraversal = MO.fromTraversable(Tree.tree)<parse5.ChildNode>();
const updated = DOMTraversal.composeTraversal(theScriptTags).modify(() => '')(mytree);

type Attribute = {
  name: string,
  value: string
}
type NodeRep = {
  nodeName: string,
  attrs?: Attribute[],
  value?: string,
  childNodes?: NodeRep[]
}

const foldedTree = Tree.fold((a:parse5.ChildNode, bs: Array<parse5.ChildNode>) => {
  const result = {
    ...a,
  childNodes: bs
  }
  return result;
})(updated)

const processedTree = {
  nodeName: 'body',
  tagName: 'body',
  attrs: [],
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  childNodes: [ ],
  parentNode: {}
};
console.dir(parsed.childNodes[1].childNodes[1], {depth: 2});
console.log('----- the result ------');
console.log(mytree);
// console.log(foldedTree)
// console.log(JSON.stringify(foldedTree, null, 4))
// console.log(updated.forest[1].forest[0].forest);

// type S = ReadonlyArray<parse5.Attribute>;
// const sa = pipe(
//   MO.lens.id<S>(),
//   MO.lens.findFirst((n) => n.name === 'src')
// );
// const res = sa.set({ name: 'src', value: '' })([
//   { name: 'src', value: 'whatthehell' },
// ]);
// console.log(res);

// console.log('------   tree fold tests ---------');
//
// const sum2 = (as: Array<number>) => as.reduce((a, acc) => {
//   console.log('a is', a)
//   console.log('acc is', acc)
//   return a + acc;
// }, 0)
//
// type Returntree = {value: number, children: Array<Returntree>}
//
// const t = Tree.make(1, [Tree.make(5, [Tree.make(51), Tree.make(12)]), Tree.make(9)])
// console.log(t)
// const folded = Tree.fold((a: number, bs: Array<number>)  => {
//   return {
//     value: a,
//     children: bs
//   }
// })(t)

// console.log(JSON.stringify(folded, null, 4));
