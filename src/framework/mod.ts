const toString = (value: string | number | any[] | object): string => {
  return Array.isArray(value) || typeof value === "object"
    ? JSON.stringify(value)
    : typeof value === "number"
    ? value.toString()
    : value;
};

const charMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export const escapeHtml = (value: string | number | any[] | object) => {
  return String(toString(value)).replace(/[&<>"'\`=\/]/g, (s: string) =>
    s in charMap ? charMap[s as keyof typeof charMap] : s
  );
};

export const unescapeHtml = (value: string) => {
  const reverseCharMap = Object.fromEntries(
    Object.entries(charMap).map(([a, b]) => [b, a])
  );

  const r = new RegExp("(" + Object.keys(reverseCharMap).join("|") + ")", "g");

  return String(value).replace(r, (s: string) => reverseCharMap[s]);
};

export const parseFormValue = (
  value: string,
  type: "number" | "string" | "array" | "object"
) => {
  const handlers = {
    number: (value: string) => new Number(value),
    string: (value: string) => value,
    array: (value: string) => JSON.parse(value),
    object: (value: string) => JSON.parse(value),
  };

  return handlers[type](value);
};

export const toFormValue = (value: unknown) => {
  return JSON.stringify(value);
};

export const fromFormValue = (value: string) => {
  return JSON.parse(value);
};

export const toHtmlText = (value: unknown) => {
  if (typeof value === "string") {
    return escapeHtml(value);
  }

  if (typeof value === "number") {
    return escapeHtml(value.toString());
  }

  return escapeHtml(toFormValue(value));
};
