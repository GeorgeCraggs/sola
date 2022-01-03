import { assertEquals } from "https://deno.land/std@0.119.0/testing/asserts.ts";
import walker from "./walker.ts";
import { HtmlTagNode, EachBlockNode, TextNode } from "../ast/sfc.ts";

Deno.test({
  name: "walks top-level nodes",
  fn: () => {
    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    const firstNodeChild: EachBlockNode = {
      type: "EachBlock",
      params: [{
        type: "Identifier",
        name: "value",
      }],
      iterator: {
        type: "Identifier",
        name: "something",
      },
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    const firstNodeChild: EachBlockNode = {
      type: "EachBlock",
      params: [{
        type: "Identifier",
        name: "value",
      }],
      iterator: {
        type: "Identifier",
        name: "something",
      },
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    const firstNodeChild: EachBlockNode = {
      type: "EachBlock",
      params: [{
        type: "Identifier",
        name: "value",
      }],
      iterator: {
        type: "Identifier",
        name: "something",
      },
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    const firstNodeChild: EachBlockNode = {
      type: "EachBlock",
      params: [{
        type: "Identifier",
        name: "value",
      }],
      iterator: {
        type: "Identifier",
        name: "something",
      },
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    assertEquals(((firstNode.children[0] as EachBlockNode).children[0] as TextNode).text, "Replaced");
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

    const firstNodeChild: EachBlockNode = {
      type: "EachBlock",
      params: [{
        type: "Identifier",
        name: "value",
      }],
      iterator: {
        type: "Identifier",
        name: "something",
      },
      children: [textNode],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const firstNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
      children: [firstNodeChild],
      fileIdentifier: "",
      startIndex: -1,
      endIndex: -1,
    };

    const secondNode: HtmlTagNode = {
      type: "HtmlTag",
      tag: "",
      attributes: [],
      directives: [],
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

    assertEquals((firstNode.children[0] as EachBlockNode).children[0], undefined);
  },
});
