# sb-edit-playground

## Setup

```
# this setup assumes you have Leopard (formerly scratch-js)
& sb-edit exist in pwd
# it also assumes you have run npm link in sb-edit
git clone https://github.com/towerofnix/sb-edit-playground
cd sb-edit-playground
ln -s ../scratch-js/scratch-js scratch-js
ln -s ../sb-edit/src sb-edit
npm link sb-edit

# to run sb-edit:
# cd sb-edit-playground
node index.js (my file.sb3) (output-format)
# result will be in sb-edit-playground/out/(output-format)
# run index.js without an output format to get a list

# while developing sb-edit:
# cd sb-edit-playground/sb-edit
npm run watch

# while testing scratch-js output:
# cd sb-edit-playground
npx http-server -p 3001 # or your favorite port

# git works in the linked directories!
# it will target scratch-js or sb-edit accordingly
# also be sure to watch out when undoing changes, etc
# always do a git status before you accidentally run
# git checkout -- . in the wrong repository 0_0
```
