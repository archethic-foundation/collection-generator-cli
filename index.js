#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mint from './src/commands/mint.js';
import upload from './src/commands/upload.js';
import about from './src/commands/about.js';
import generate from './src/commands/generate.js';

const y = yargs(hideBin(process.argv));

y.command(about).help();
y.command(mint).help();
y.command(upload).help();
y.command(generate).help();


y.parse();
