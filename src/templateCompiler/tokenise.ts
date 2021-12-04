export type Token = {
  type: "plain" | "script" | "block" | "endblock";
  content: string;
};

export default (template: string) => {
  let bracketDepth = 0;

  const tokens: Token[] = [
    {
      type: "plain",
      content: "",
    },
  ];

  let currentToken = tokens[0];

  for (const character of template) {
    if (character === "{") {
      bracketDepth++;
    }

    if (character === "}") {
      bracketDepth--;
    }

    if (
      character === "#" &&
      currentToken.type === "script" &&
      currentToken.content === ""
    ) {
      currentToken.type = "block";
      continue;
    }

    if (
      character === "/" &&
      currentToken.type === "script" &&
      currentToken.content === ""
    ) {
      currentToken.type = "endblock";
      continue;
    }

    if (
      (bracketDepth !== 0 && currentToken.type === "plain") ||
      (bracketDepth === 0 &&
        (currentToken.type === "script" ||
          currentToken.type === "block" ||
          currentToken.type === "endblock"))
    ) {
      tokens.push({
        type: bracketDepth === 0 ? "plain" : "script",
        content: "",
      });
      currentToken = tokens[tokens.length - 1];
    }

    if (character === "{" || character === "}") {
      continue;
    }

    currentToken.content = currentToken.content + character;
  }

  return tokens;
}
