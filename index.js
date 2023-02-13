#!/usr/bin/env node

const basePath = process.cwd();
const {
  startCreating,
  buildSetup
} = require(`${basePath}/src/main.js`);
const yargs = require('yargs');
const {
  hideBin
} = require('yargs/helpers')
const mint = require('./archethic/mint.js')
const upload = require('./archethic/upload.js')

const about = require('./about.js')

const y = yargs(hideBin(process.argv))

y.command(about).help()
y.command(mint).help()
y.command(upload).help()
y.command('generate', 'Generate NFT', () => {
  buildSetup();
  startCreating();
}).help()

y.parse()