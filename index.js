#!/usr/bin/env node

import { startCreating, buildSetup } from './src/main.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mint from './src/commands/mint.js';
import upload from './src/commands/upload.js';
import about from './src/commands/about.js';


const y = yargs(hideBin(process.argv));

y.command(about).help();
y.command(mint).help();
y.command(upload).help();
y.command('generate', 'Generate NFT', () => {
  buildSetup();
  startCreating();
}).help();


y.parse();
