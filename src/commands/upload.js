import fs from 'fs';
import path from 'path';
import Archethic, { Crypto, Utils } from 'archethic'
import AEWeb from 'aeweb';
import * as cli from './cli.js'
import { exit } from 'process';
import chalk from 'chalk';
import yesno from 'yesno';

const { deriveAddress } = Crypto
const { originPrivateKey, fromBigInt, uint8ArrayToHex } = Utils
const basePath = process.cwd();

const command = 'upload';

const describe = 'Upload generated nfts and create reference address';

const builder = {
  seed: {
    describe: 'Seed is a string representing the transaction chain entropy to be able to derive and generate the keys for the transactions',
    demandOption: true,
    type: 'string',
    alias: 's',
  },
  endpoint: {
    describe: 'Endpoint is the URL of a welcome node to receive the transaction',
    demandOption: true,
    type: 'string',
    alias: 'e',
  }
};



const handler = async function (argv) {
  try {
    const folderPath = cli.normalizeFolderPath(`${basePath}/build/images`)
    const baseSeed = argv.seed
    const {
      refSeed,
      filesSeed
    } = cli.getSeeds(baseSeed)

    const baseAddress = deriveAddress(baseSeed, 0)
    const refAddress = deriveAddress(refSeed, 0)
    const filesAddress = deriveAddress(filesSeed, 0)

    const endpoint = new URL(argv.endpoint).origin

    console.log(chalk.blue(`Connecting to ${endpoint}`))

    const archethic = await new Archethic(endpoint).connect()

    const baseIndex = await archethic.transaction.getTransactionIndex(baseAddress)
    const refIndex = await archethic.transaction.getTransactionIndex(refAddress)
    let filesIndex = await archethic.transaction.getTransactionIndex(filesAddress)

    const aeweb = new AEWeb(archethic)
    const files = cli.getFiles(folderPath)

    if (files.length === 0) throw 'folder "' + path.basename(folderPath) + '" is empty'

    files.forEach(({
      filePath,
      data
    }) => aeweb.addFile(filePath, data))

    let transactions = aeweb.getFilesTransactions()

    transactions = transactions.map(tx => {
      const index = filesIndex
      filesIndex++
      return tx.build(filesSeed, index).originSign(originPrivateKey)
    })

    const refTx = await aeweb.getRefTransaction(transactions)

    refTx.build(refSeed, refIndex).originSign(originPrivateKey)

    transactions.push(refTx)

    const {
      refTxFees,
      filesTxFees
    } = await cli.estimateTxsFees(archethic, transactions)

    const transferTx = archethic.transaction.new()
      .setType('transfer')
      .addUCOTransfer(refAddress, refTxFees)
      .addUCOTransfer(filesAddress, filesTxFees)

    transferTx.build(baseSeed, baseIndex).originSign(originPrivateKey)

    transactions.unshift(transferTx)

    const {
      fee,
      rates
    } = await archethic.transaction.getTransactionFee(transferTx)

    const fees = fromBigInt(fee + refTxFees + filesTxFees)

    const ok = await validFees(fees, rates, transactions.length)

    if (ok) {
      console.log(chalk.blue('Sending transactions...'))

      let rawdata = fs.readFileSync(`${basePath}/build/json/_metadata.json`);
      let data = JSON.parse(rawdata);

      for (let edition in data.collection) {

        let item = data.collection[edition];
        item.content.aeweb = `${endpoint}/api/web_hosting/${uint8ArrayToHex(refAddress)}/${item.edition}.png`;

        fs.writeFileSync(
          `${basePath}/build/json/${item.edition}.json`,
          JSON.stringify(item, null, 2)
        );

      }

      fs.writeFileSync(
        `${basePath}/build/json/_metadata.json`,
        JSON.stringify(data, null, 2)
      );

      await sendTransactions(transactions, 0, endpoint)
        .then(() => {
          console.log(
            chalk.green(
              'Successfully uploaded files at -',
              endpoint + '/api/web_hosting/' + uint8ArrayToHex(refAddress) + '/'
            )
          )
          exit(0)
        })
        .catch(error => {
          console.log(
            'Transaction validation error : ' + error
          )
          exit(1)
        })

    } else {
      throw 'User aborted deployment.'
    }

  } catch (e) {
    console.log(e)
    exit(1)
  }
}

async function validFees(fees, rates, nbTxs) {
  console.log(chalk.yellowBright(
    'Total Fee Requirement would be : ' +
    fees +
    ' UCO ( $ ' +
    (rates.usd * fees).toFixed(2) +
    ' | € ' +
    (rates.eur * fees).toFixed(2) +
    '), for ' + nbTxs + ' transactions.'
  ))

  return await yesno({
    question: chalk.yellowBright(
      'Do you want to continue. (yes/no)'
    ),
  })
}

async function sendTransactions(transactions, index, endpoint) {
  return new Promise(async (resolve, reject) => {

    const tx = transactions[index]
    tx
      .on('requiredConfirmation', async (nbConf) => {
        if (index + 1 == transactions.length) {
          resolve()
        } else {
          sendTransactions(transactions, index + 1, endpoint)
            .then(() => resolve())
            .catch(error => reject(error))
        }
      })
      .on('error', (context, reason) => reject(reason))
      .on('timeout', (nbConf) => reject('Transaction fell in timeout'))
      .send(75)
  })
}

export default {
  command,
  describe,
  builder,
  handler
};
