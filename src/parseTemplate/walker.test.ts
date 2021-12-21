import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import walker from "./walker.ts";
import { HtmlTagNode, EachBlock, TextNode } from "./mod.ts";

Deno.test({
  name: "walks top-level nodes",
  fn: () => {
    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const visitedNodes: any[] = [];

    walker([firstNode, secondNode], (node) => {
      visitedNodes.push(node);
    });

    assertEquals(visitedNodes, [firstNode, secondNode]);
  },
});

Deno.test({
  name: "walks node tree",
  fn: () => {
    const textNode: TextNode = {
      type: "Text",
      text: "Something",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNodeChild: EachBlock = {
      type: "EachBlock",
      params: "",
      iterator: "",
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const visitedNodes: any[] = [];

    walker([firstNode, secondNode], (node) => {
      visitedNodes.push(node);
    });

    assertEquals(visitedNodes, [
      firstNode,
      firstNodeChild,
      textNode,
      secondNode,
    ]);
  },
});

Deno.test({
  name: "skips node children",
  fn: () => {
    const textNode: TextNode = {
      type: "Text",
      text: "Something",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNodeChild: EachBlock = {
      type: "EachBlock",
      params: "",
      iterator: "",
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const visitedNodes: any[] = [];

    walker([firstNode, secondNode], (node) => {
      visitedNodes.push(node);

      return true;
    });

    assertEquals(visitedNodes, [firstNode, secondNode]);
  },
});

Deno.test({
  name: "replace top-level node",
  fn: () => {
    const textNode: TextNode = {
      type: "Text",
      text: "Original",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNodeChild: EachBlock = {
      type: "EachBlock",
      params: "",
      iterator: "",
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const replacementNode: TextNode = {
      type: "Text",
      text: "Replaced",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const nodeTree = [firstNode, secondNode];

    walker(nodeTree, function (node) {
      if (node == firstNode) {
        this.replace(replacementNode);
      }
    });

    assertEquals(nodeTree, [replacementNode, secondNode]);
  },
});

Deno.test({
  name: "replace child node",
  fn: () => {
    const textNode: TextNode = {
      type: "Text",
      text: "Original",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNodeChild: EachBlock = {
      type: "EachBlock",
      params: "",
      iterator: "",
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const replacementNode: TextNode = {
      type: "Text",
      text: "Replaced",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const nodeTree = [firstNode, secondNode];

    walker(nodeTree, function (node) {
      if (node.type === "Text") {
        this.replace(replacementNode);
      }
    });

    assertEquals(((firstNode.children[0] as EachBlock).children[0] as TextNode).text, "Replaced");
  },
});

Deno.test({
  name: "remove node",
  fn: () => {
    const textNode: TextNode = {
      type: "Text",
      text: "Original",
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNodeChild: EachBlock = {
      type: "EachBlock",
      params: "",
      iterator: "",
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: {
        type: "AttributeList",
        attributes: [],
        directives: [],
      },
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const nodeTree = [firstNode, secondNode];

    walker(nodeTree, function (node) {
      if (node.type === "Text") {
        this.replace(null);
      }
    });

    assertEquals((firstNode.children[0] as EachBlock).children[0], undefined);
  },
});
