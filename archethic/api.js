const zlib = require('zlib');
const isEqual = require('lodash/isEqual.js');
const path = require('path');
const Archethic = require('archethic');
const Crypto = Archethic.Crypto;
const Utils = Archethic.Utils;

const { aesEncrypt, ecEncrypt, randomSecretKey } = Crypto;
const { uint8ArrayToHex } = Utils;
const nativeCryptoLib = require('crypto');

const MAX_FILE_SIZE = 3145728 - 45728;
const AEWEB_VERSION = 1;
const HASH_FUNCTION = 'sha1';

class AEWeb {
  constructor(archethic) {
    this.archethic = archethic;
    this.txsContent = [];
    this.metaData = {};
  }

  addFile(naivePath, data) {
    const size = Buffer.byteLength(data);
    if (size === 0) return;

    const hash = nativeCryptoLib.createHash(HASH_FUNCTION).update(data).digest('hex');
    const content = zlib.gzipSync(data).toString('base64url');

    const tabPath = naivePath.split(path.sep);
    if (tabPath[0] === '') tabPath.shift();
    const filePath = tabPath.join('/');

    this.metaData[filePath] = { hash: hash, size: size, encoding: 'gzip', addresses: [] };

    if (content.length >= MAX_FILE_SIZE) {
      handleBigFile(this.txsContent, filePath, content);
    } else {
      handleNormalFile(this.txsContent, filePath, content);
    }
  }

  addSSLCertificate(sslCertificate, sslKey) {
    this.sslCertificate = sslCertificate;
    this.sslKey = sslKey;
  }

  getFilesTransactions() {
    return this.txsContent.map(txContent => {
      const tx = this.archethic.transaction.new()
        .setType('hosting')
        .setContent(JSON.stringify(txContent.content));

      const index = this.txsContent.indexOf(txContent);
      txContent.content = tx.data.content;
      this.txsContent.splice(index, 1, txContent);

      return tx;
    });
  }

  async getRefTransaction(transactions) {
    const { metaData, refContent } = getMetaData(this.txsContent, transactions, this.metaData, this.sslCertificate);
    this.metaData = metaData;

    const refTx = this.archethic.transaction.new()
      .setType('hosting')
      .setContent(refContent);

    if (this.sslKey) {
      const storageNoncePublicKey = await this.archethic.network.getStorageNoncePublicKey();
    

      const aesKey = randomSecretKey()
      const encryptedSecretKey = ecEncrypt(aesKey, storageNoncePublicKey)
      const encryptedSslKey = aesEncrypt(this.sslConfiguration.key, aesKey)

      refTx.addOwnership(encryptedSslKey, [{ publicKey: storageNoncePublicKey, encryptedSecretKey: encryptedSecretKey }])
    }

    return refTx
  }

  reset() {
    this.txsContent = []
    this.sslCertificate = undefined
    this.sslKey = undefined
    this.metaData = {}
  }
}

function handleBigFile(txsContent, filePath, content) {
  while (content.length > 0) {
    
    const part = content.slice(0, MAX_FILE_SIZE)
    content = content.replace(part, '')
    
    const txContent = {
      content: {},
      size: part.length,
      refPath: [],
    }
    txContent.content[filePath] = part
    txContent.refPath.push(filePath)
    txsContent.push(txContent)
  }
}

function handleNormalFile(txsContent, filePath, content) {
  
  const fileSize = content.length + filePath.length + 7
  
  const txContent = getContentToFill(txsContent, fileSize)
  const index = txsContent.indexOf(txContent)

  txContent.content[filePath] = content
  txContent.refPath.push(filePath)
  txContent.size += fileSize

  if (index === -1) {
    
    txsContent.push(txContent)
  } else {
    
    txsContent.splice(index, 1, txContent)
  }
}

function getContentToFill(txsContent, contentSize) {
  const content = txsContent.find(txContent => (txContent.size + contentSize) <= MAX_FILE_SIZE)
  if (content) {
    return content
  } else {
    return {
      content: {},
      size: 0,
      refPath: []
    }
  }
}

function getMetaData(txsContent, transactions, metaData, sslCertificate) {
 
  transactions.forEach((tx) => {
    if (!tx.address) throw 'Transaction is not built'

    const txContent = txsContent.find(val => isEqual(val.content, tx.data.content))

    if (!txContent) throw 'Transaction content not expected'
    
    const address = uint8ArrayToHex(tx.address)
    
    return txContent.refPath.forEach((filePath) => {
      const { addresses } = metaData[filePath]
      addresses.push(address)
      metaData[filePath]['addresses'] = addresses
    })
  })

  metaData = sortObject(metaData)

  const ref = {
    aewebVersion: AEWEB_VERSION,
    hashFunction: HASH_FUNCTION,
    metaData: metaData
  }

  if (sslCertificate) {
    ref.sslCertificate = sslCertificate
  }

  return { metadata: metaData, refContent: JSON.stringify((ref)) }
}

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce(function (acc, key) {
      acc[key] = obj[key]
      return acc
    }, {})
}

module.exports = AEWeb;