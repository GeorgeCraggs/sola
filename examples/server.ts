import { serve } from "https://deno.land/std@0.119.0/http/server.ts";
import * as Home from "./build/Home.js";
import * as Error404 from "./build/Error404.js";
import * as Counter from "./build/Counter.js";
import * as Todo from "./build/Todo.js";
import * as AdvancedTodo from "./build/AdvancedTodo.js";
import * as ApiCards from "./build/ApiCards.js";

console.log("http://localhost:8005/");

const routes: {
  match: string;
  component: {
    Component: (req: Request) => Promise<string>;
    Styles: string;
  };
}[] = [
  {
    match: "/",
    component: Home,
  },
  {
    match: "/counter",
    component: Counter,
  },
  {
    match: "/todo",
    component: Todo,
  },
  {
    match: "/advanced-todo",
    component: AdvancedTodo,
  },
  {
    match: "/api-cards",
    component: ApiCards,
  },
];

const css = routes.map(({ component }) => component.Styles).join("\n");

serve(
  async (req: Request) => {
    const path =
      "/" + req.url.replace(/^https?:\/\/[^\/]+\//, "").replace(/\/$/, "");

    let componentHtml;

    const matchedRoute = routes.find(({ match }) => path === match);

    try {
      componentHtml = await (matchedRoute?.component || Error404).Component(
        req
      );
    } catch (e) {
      componentHtml = "Oops, an error occurred";
      console.error(e);
    }
    return new Response(
      `
<html>
  <head>
    <title>My Test App</title>
    <link href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet">
    <style>
    ${css.trim()}
    </style>
  </head>
  <body class="p-4 grid gap-4 max-w-4xl m-auto">
    ${componentHtml}
  </body>
</html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );
  },
  { port: 8005 }
);
