import type {
  DocumentMode,
  DocumentFragment,
  TextNode,
  ElementLocation,
  Location,
  AttributesLocation,
  Attribute,
  Element,
  DocumentType,
} from 'parse5';
import { DOCUMENT_MODE } from './libs/html.js';
import * as MO from 'monocle-ts';
import { tree as T, option as O, array as A, eq as Eq, boolean as Bool } from 'fp-ts';
import { identity, pipe, flow, Refinement } from 'fp-ts/es6/function';

// so, internally I can use Tree and Forest, but the functions must take and return these standard types
// or in fact createDocument can return a documentTree, but then the
// getters and mutations and setters must conform to the interface
// more exactly, document is a Tree<NodeOrSomething>, but the rest?
// Element is also a Tree<NodeOrSomething> (everything that has a childNodes is a Tree of something)

// Let's better model the Node types and data
// Firt start with the simplest node just nodeName
// then, enumerate all the possible types (Document, DocumentFragment, Element, Comment, Text)
// they all have nodeName, and the childrenNodes does NOT exist, it's via the Tree
// they all have parentNode, except Document and DocumentFragment (?)
// tagName : forget it for now
// namespaceURI : forget it for now
// attributes : optional ?
// so let's add a nodeType discriminator (nodeType: Document | DocFragment | Element)
// maybe Partial<extraoptions> like attributes

type Node_ts = {
  kind: string;
  nodeName: string;
};

/**
 * Default tree adapter DocumentType interface.
 */
type DocumentType_ts = Node_ts & {
  kind: 'documenttype';
  nodeName: '#documentType';
  name: string;
  publicId: string;
  systemId: string;
};

type Document_ts = Node_ts & {
  kind: 'document';
  nodeName: '#document';
  // childNodes: ChildNode[];
};

type DocumentFragment_ts = Node_ts & {
  kind: 'documentfragment';
  nodeName: '#document-fragment';
  // childNodes: ChildNode[];
};

type Attribute_ts = {
  name: string;
  value: string;
};

type Node_tsTree = T.Tree<Node_ts>;

type Element_ts = Node_ts & {
  kind: 'element';
  attrs: Array<Attribute_ts>;
  parentNode: Node_tsTree | null;
  // childNodes: ChildNode[];
};

type TextNode_ts = Node_ts & {
  kind: 'textnode';
  nodeName: '#text';
  value: string;
  parentNode: Node_tsTree | null;
};

type CommentNode_ts = Node_ts & {
  kind: 'commentnode';
  nodeName: '#comment';
  data: string;
  parentNode: Node_tsTree | null;
};

type DocumentMode_ts = 'no-quirks' | 'quirks' | 'limited-quirks';

type ParentNode_ts = Document_ts | Element_ts | DocumentFragment_ts; // not sure will need this
type ChildNode_ts = CommentNode_ts | Element_ts | TextNode_ts; // not sure will need this
type DocNode_ts =
  | ChildNode_ts
  | Document_ts
  | DocumentFragment_ts
  | DocumentType_ts;
type NodeType = DocNode_ts['kind'];

type DocNodeTree_ts = T.Tree<DocNode_ts>;

const NodeEq: Eq.Eq<Node_ts> = {
  equals: (a: Node_ts, b: Node_ts) => {
    console.log('equals?', a, b);
    return a.nodeName === b.nodeName}
}

const SameNodeKind: Eq.Eq<Node_ts> = {
 equals: (a: Node_ts, b: Node_ts) => {
    return a.kind === b.kind;
  }
}

const SameTreeNodeKind: Eq.Eq<Node_tsTree> = {
  equals: (a:Node_tsTree, b:Node_tsTree) => {
    return SameNodeKind.equals(T.extract(a), T.extract(b));
  }
}

const DOMTraversal = MO.fromTraversable(T.tree)<DocNodeTree_ts>();

function isNodeOfKind<Something extends Node_ts>(a: DocNode_ts, b: Something): b is Something  {
  return (a.kind === b.kind);
}

const isDocTypeNode: Refinement<DocNode_ts, DocumentType_ts> = (a: DocNode_ts): a is DocumentType_ts => {
  return a.kind === 'documenttype';
};

//Node construction
export const createDocument = function (): DocNodeTree_ts {
  return T.make({
    nodeName: '#document',
    kind: 'document',
    mode: DOCUMENT_MODE.NO_QUIRKS,
    // childNodes: []
  });
};

export const createDocumentFragment = function (): DocNodeTree_ts {
  return T.make({
    nodeName: '#document-fragment',
    kind: 'documentfragment',
    // childNodes: []
  });
};

export const createElement = function (
  tagName: string,
  namespaceURI: string,
  attrs: Array<Attribute>
): Element_ts {
  return {
    nodeName: tagName,
    kind: 'element',
    attrs: attrs,
    parentNode: null,
    // childNodes: [],
    // parentNode: null
  };
};

export const createCommentNode = function (data: string): CommentNode_ts {
  return {
    nodeName: '#comment',
    kind: 'commentnode',
    data: data,
    parentNode: null,
  };
};

export const createTextNode = function (value: string): TextNode_ts {
  return {
    nodeName: '#text',
    kind: 'textnode',
    value: value,
    parentNode: null,
  };
};

//Tree mutation
export const appendChild = function (
  parentNode: DocNodeTree_ts,
  newNode: ChildNode_ts
) {
  // TODO clean this
  newNode.parentNode = parentNode;
  parentNode.forest.push(T.make(newNode));
};

export const insertBefore = function (
  parentNode: DocNodeTree_ts,
  newNode: ChildNode_ts,
  referenceNode: DocNodeTree_ts
) {
  // TODO clean this
  newNode.parentNode = parentNode;
  const insertionIdx = parentNode.forest.indexOf(referenceNode);
  parentNode.forest.splice(insertionIdx, 0, T.make(newNode));
};

export const setTemplateContent = function (
  templateElement: Element_ts,
  contentElement: T.Tree<Element_ts>
) {
  // TODO clean this
  appendChild(T.make(templateElement), T.extract(contentElement));
};

export const getTemplateContent = function (
  templateElement: T.Tree<Element_ts>
): T.Tree<Element_ts> {
  return templateElement.forest[0];
};

export const setDocumentType = function (
  document: DocNodeTree_ts,
  name: string,
  publicId: string,
  systemId: string
) {
  const doctypePrism = new MO.Prism<DocNode_ts, DocumentType_ts>(
    (s) => (isDocTypeNode(s) ? O.some(s) : O.none),
    identity
  );
  const Node_tsFromTree = MO.Lens.fromProp<DocNodeTree_ts>()('value');
  const DocumentChildrenTraversal: MO.Traversal<
    Array<T.Tree<DocNode_ts>>,
    T.Tree<DocNode_ts>
  > = MO.fromTraversable(A.array)<T.Tree<DocNode_ts>>();

  const theForest = MO.Lens.fromProp<DocNodeTree_ts>()('forest');

  const updateDocTypeElem = theForest
    .composeTraversal(DocumentChildrenTraversal)
    .composeLens(Node_tsFromTree)
    .composePrism(doctypePrism)
    .modify((a) => {
      return { ...a, name: name, publicId: publicId, systemId: systemId };
    });
  const hasDoctype = A.elem(SameTreeNodeKind)(T.of({nodeName:'#documentType', kind:'documenttype'}))
  return pipe(
    hasDoctype(document.forest),
    Bool.fold(
      () => document,
      () => updateDocTypeElem(document),
    )
  )
};

console.clear();
console.log('*******************************');

export const setDocumentMode = function(document: DocNodeTree_ts, mode: DocumentType_ts) {
  console.log('TODO: setDocumentMode');
};

export const getDocumentMode = function(document: DocNodeTree_ts): DocumentMode_ts {
    return 'no-quirks';
};
//
export const detachNode = function(node: DocNode_ts) {
  console.log('TODO: detachNode')
    // if (node.parentNode) {
    //     const idx = node.parentNode.childNodes.indexOf(node);
    //
    //     node.parentNode.childNodes.splice(idx, 1);
    //     node.parentNode = null;
    // }
};
//

export const insertText = function (parentNode: Node_tsTree, text: string) {
  const aTextNode: TextNode_ts = {
    nodeName: "#text",
    kind: 'textnode',
    value: 'empty AtextNode',
    parentNode: null
  }
  const valueProp = MO.Lens.fromProp<TextNode_ts>()('value');

  function isItATextNode(e: Node_ts): e is TextNode_ts {
    return e.kind === 'textnode';
  }

  const lastTextNode = (e: T.Forest<Node_ts>): O.Option<TextNode_ts> => pipe(
    e,
    A.last,
    O.map(T.extract),
    O.chain(
      e => (isItATextNode(e) ? O.some(e) : O.none)
    ),
  );

  const lastTextOptional = new MO.Optional<T.Forest<Node_ts>, TextNode_ts>(
    s => pipe(s, lastTextNode, O.altW(() => O.some(aTextNode))),
    a => s => pipe(s, lastTextNode, O.fold(
      () => A.snoc(s, T.of(a)),
      () => [...s.slice(0, s.length - 1), T.of(a)]
    ))
  )

  const theForest = MO.Lens.fromProp<Node_tsTree>()('forest');
  const updateLastText = lastTextOptional.composeLens(valueProp);
  const updateInForest = theForest.composeOptional(updateLastText)
  const doit3 = updateInForest.modify(() => text)
  parentNode = doit3(parentNode);
  return parentNode;
};

const mytestForest: DocNodeTree_ts = T.make(
  {
    nodeName: '#document',
    kind: 'element',
    parentNode: null,
    attrs: [],
  },
  [
    T.make<DocNode_ts>({
      nodeName: 'something',
      kind: 'element',
      parentNode: null,
      attrs: [],
    }),
    T.make<DocumentType_ts>({
      kind: 'documenttype',
      nodeName: '#documentType',
      publicId: 'myid',
      systemId: 'whatever',
      name: 'whatever',
    }),
    T.make<Element_ts>({
      nodeName: 'something',
      kind: 'element',
      parentNode: null,
      attrs: [],
    }),
    T.make<TextNode_ts>({
      kind: 'textnode',
      nodeName: '#text',
      value: 'hello at last',
      parentNode: null,
    }),
    T.make<Element_ts>({
      nodeName: 'something',
      kind: 'element',
      parentNode: null,
      attrs: [],
    }),
  ]
);

const myinsertedtext = insertText(mytestForest, 'newinserted text');
console.dir(myinsertedtext, {depth:3});

//
// export const insertTextBefore = function(parentNode, text, referenceNode) {
//     const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];
//
//     if (prevNode && prevNode.nodeName === '#text') {
//         prevNode.value += text;
//     } else {
//         insertBefore(parentNode, createTextNode(text), referenceNode);
//     }
// };
//
// export const adoptAttributes = function(recipient, attrs) {
//     const recipientAttrsMap = [];
//
//     for (let i = 0; i < recipient.attrs.length; i++) {
//         recipientAttrsMap.push(recipient.attrs[i].name);
//     }
//
//     for (let j = 0; j < attrs.length; j++) {
//         if (recipientAttrsMap.indexOf(attrs[j].name) === -1) {
//             recipient.attrs.push(attrs[j]);
//         }
//     }
// };
//
// //Tree traversing
// export const getFirstChild = function(node) {
//     return node.childNodes[0];
// };
//
// export const getChildNodes = function(node) {
//     return node.childNodes;
// };
//
// export const getParentNode = function(node) {
//     return node.parentNode;
// };
//
// export const getAttrList = function(element) {
//     return element.attrs;
// };
//
// //Node data
// export const getTagName = function(element) {
//     return element.tagName;
// };
//
// export const getNamespaceURI = function(element) {
//     return element.namespaceURI;
// };
//
// export const getTextNodeContent = function(textNode) {
//     return textNode.value;
// };
//
// export const getCommentNodeContent = function(commentNode) {
//     return commentNode.data;
// };
//
// export const getDocumentTypeNodeName = function(doctypeNode) {
//     return doctypeNode.name;
// };
//
// export const getDocumentTypeNodePublicId = function(doctypeNode) {
//     return doctypeNode.publicId;
// };
//
// export const getDocumentTypeNodeSystemId = function(doctypeNode) {
//     return doctypeNode.systemId;
// };
//
// //Node types
// export const isTextNode = function(node) {
//     return node.nodeName === '#text';
// };
//
// export const isCommentNode = function(node) {
//     return node.nodeName === '#comment';
// };
//
// export const isDocumentTypeNode = function(node) {
//     return node.nodeName === '#documentType';
// };
//
// export const isElementNode = function(node) {
//     return !!node.tagName;
// };
//
// // Source code location
// export const setNodeSourceCodeLocation = function(node, location) {
//     node.sourceCodeLocation = location;
// };
//
// export const getNodeSourceCodeLocation = function(node) {
//     return node.sourceCodeLocation;
// };
//
// export const updateNodeSourceCodeLocation = function(node, endLocation) {
//     node.sourceCodeLocation = Object.assign(node.sourceCodeLocation, endLocation);
// };
