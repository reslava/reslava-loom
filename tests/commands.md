npm install --save-dev ts-node @types/node

npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/mono-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts