import * as parse5 from 'parse5';
import { io as IO, tree as Tree, either as E, array as A, option as O } from 'fp-ts';
import * as MO from 'monocle-ts';
import { pipe, identity } from 'fp-ts/es6/function';

console.clear();

const parseDOMString = (d: string): IO.IO<parse5.Document> => () => {
  return parse5.parse(d);
};

const html =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="next-head-count" content="2"><noscript data-n-css=""></noscript><link rel="preload" href="/_next/static/chunks/main.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/webpack.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/_app.js?ts=1610693370703" as="script"><link rel="preload" href="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703" as="script"><noscript id="__next_css__DO_NOT_USE__"></noscript><script charset="utf-8" src="/_next/static/chunks/0.js"></script></head><body><script src="/crashme.js">console.log("hello crahs")</script><div id="__next"><div><h1>Test Page</h1><p>The counter is: <!-- -->0</p></div></div><script src="/_next/static/chunks/react-refresh.js?ts=1610693370703"></script><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"/thirdpage","query":{},"buildId":"development","nextExport":true,"autoExport":true,"isFallback":false}</script><script nomodule="" src="/_next/static/chunks/polyfills.js?ts=1610693370703"></script><script src="/_next/static/chunks/main.js?ts=1610693370703"></script><script src="/_next/static/chunks/webpack.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/_app.js?ts=1610693370703"></script><script src="/_next/static/chunks/pages/thirdpage.js?ts=1610693370703"></script><div id="__next-build-watcher" style="position: fixed; bottom: 10px; right: 20px; width: 0px; height: 0px; z-index: 99999;"></div><script src="/_next/static/development/_buildManifest.js?ts=1610693370703"></script><script src="/_next/static/development/_ssgManifest.js?ts=1610693370703"></script></body></html>';

const htmlsimple = '<!DOCTYPE html><html><head></head><body><p>Im just some<br /> text</p><script src="ugly.js"></script><h1>hello world!</h1></body></html>'

const someChildNodes = (a: parse5.Node) => {
  if ('childNodes' in a) {
    return a.childNodes;
  } else {
    return [];
  }
};

const parsed = parseDOMString(htmlsimple)();

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

const updated = pipe(mytree, Tree.map(e => newScriptAttr(e)));

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

// console.log(parsed);
console.log('----- the result ------');
// console.log(foldedTree)
// console.log(JSON.stringify(foldedTree, null, 4))
console.log(updated.forest[1].forest[0].forest);

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
