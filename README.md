# sb-edit-playground

A set of handy utilities for working with sb-edit project IO locally.

## Setup

Install dependencies:

```
cd ~/path/to/sb-edit-playground
npm install
```

Use NPM to link `leopard` and `sb-edit` from your local project/git directories, making your local clones available for requiring in other projects:

```
cd ~/path/to/leopard
npm link

cd ~/path/to/sb-edit
npm link
```

Then link `leopard` and `sb-edit` **at the same time** from inside `sb-edit-playground` (provided you're developing both):

```
cd ~/path/to/sb-edit-playground
npm link leopard sb-edit
```

## Working with `sb-edit-playground`

Compile to Leopard:

```
node index.js path/to/project.sb3 leopard
```

View Leopard project in browser:

```
cd ~/path/to/sb-edit-playground
npx http-server -p 3001
# then open http://localhost:3001/out/leopard/
```

Other formats are theoretically implement but have practical uses so unorthodox I'm sure you can figure 'em out by reading `index.js` if you must!

You can also list supported output formats by running just `node index.js path/to/project.sb3` without an output format (like `leopard`) specified.
