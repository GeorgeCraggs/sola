#!/bin/sh

#make
#deno run --allow-read --allow-write=build/ ../compile.ts components/*.sola.html
deno run --allow-read --allow-write=build/ ../compile.ts components/AdvancedTodo.sola.html

deno run --allow-net server.ts
