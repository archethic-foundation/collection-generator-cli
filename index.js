#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mint from './src/commands/mint.js';
import upload from './src/commands/upload.js';
import welcome from './src/commands/welcome.js';
import generate from './src/main.js';

const y = yargs(hideBin(process.argv));

y.command(welcome).help();
y.command(mint).help();
y.command(upload).help();
y.command(generate).help();


y.parse();
