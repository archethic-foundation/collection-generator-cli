#!/usr/bin/env node

import { startCreating, buildSetup } from './src/main.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mint from './archethic/mint.js';
import upload from './archethic/upload.js';
import about from './about.js';

const y = yargs(hideBin(process.argv));

y.command(about).help();
y.command(mint).help();
y.command(upload).help();
y.command('generate', 'Generate NFT', () => {
  buildSetup();
  startCreating();
}).help();

y.parse();
