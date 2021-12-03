import { serve } from "https://deno.land/std@0.116.0/http/server.ts";
import { Component as Home } from "./build/Home.js";
import { Component as Error404 } from "./build/Error404.js";
import { Component as Counter } from "./build/Counter.js";
import { Component as Todo } from "./build/Todo.js";

console.log("http://localhost:8005/");

const routes: {
  match: string;
  component: (req: Request) => Promise<string>,
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
];

serve(
  async (req: Request) => {
    const path = "/" + req.url.replace(/^https?:\/\/[^\/]+\//, "").replace(/\/$/, "");

    let componentHtml;

    const matchedRoute = routes.find(({ match }) => path === match);

    try {
      componentHtml = await (matchedRoute?.component || Error404)(req);
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
  { addr: ":8005" }
);
