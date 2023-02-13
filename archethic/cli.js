const fs = require('fs');
const PathLib = require('path');
const glob = require('glob');

exports.getSeeds = function (baseSeed) {
  return {
    refSeed: baseSeed + 'aeweb_ref',
    filesSeed: baseSeed + 'aeweb_files'
  };
};

exports.loadSSL = function (sslCertificateFile, sslKeyFile) {
  const sslConfiguration = {};

  if (sslCertificateFile !== undefined) {
    sslConfiguration.cert = fs.readFileSync(sslCertificateFile, 'utf8');
  }

  if (sslKeyFile !== undefined) {
    sslConfiguration.key = fs.readFileSync(sslKeyFile, 'utf8');
  }

  return sslConfiguration;
};

exports.normalizeFolderPath = function (folderPath) {
  return PathLib.normalize(folderPath.endsWith(PathLib.sep) ? folderPath.slice(0, -1) : folderPath);
};

exports.estimateTxsFees = async function (archethic, transactions) {
  const slippage = 1.01;

  let transactionsFees = transactions.map((tx) => {
    return new Promise(async (resolve, _reject) => {
      const { fee } = await archethic.transaction.getTransactionFee(tx);
      resolve(fee);
    });
  });

  transactionsFees = await Promise.all(transactionsFees);

  const fee = transactionsFees.pop();
  const refTxFees = Math.trunc(fee * slippage);

  let filesTxFees = transactionsFees.reduce((total, fee) => total += fee, 0);
  filesTxFees = Math.trunc(filesTxFees * slippage);

  return { refTxFees, filesTxFees };
};

exports.getFiles = function (folderPath, includeGitIgnoredFiles = false) {
  let files = [];
  const filters = [];
  if (fs.statSync(folderPath).isDirectory()) {
    handleDirectory(folderPath, files, includeGitIgnoredFiles, filters);

    files = files.map((file) => {
      file.filePath = file.filePath.replace(folderPath, '');
      return file;
    });
  } else {
    const data = fs.readFileSync(folderPath);
    const file_path = PathLib.basename(folderPath);
    files.push({ "filePath": file_path, data });
  }

  return files;
};

function handleDirectory(folderPath, files, includeGitIgnoredFiles, filters) {
  if (!includeGitIgnoredFiles) {
    filters = getFilters(folderPath, filters);
  }

  if (!filters.includes(folderPath)) {
    if (fs.statSync(folderPath).isDirectory()) {
      fs.readdirSync(folderPath).forEach((child) => {
        handleDirectory(folderPath + PathLib.sep + child, files, includeGitIgnoredFiles, filters);
      });
    } else {

      handleFile(folderPath, files);
    }
  }
}

function handleFile(filePath, files) {
  const data = fs.readFileSync(filePath)
  files.push({ filePath, data })
}

function getFilters(folderPath, filters) {
  let newFilters = []

  const gitIgnoreFilePath = PathLib.join(folderPath, '.gitignore')
  if (fs.existsSync(gitIgnoreFilePath)) {
    console.log('Ignore files from: ' + gitIgnoreFilePath)
    newFilters = parse(fs.readFileSync(gitIgnoreFilePath))['patterns']
    newFilters.unshift('.gitignore')
    newFilters.unshift('.git')
  }

  return newFilters.reduce((acc, path) => {
    return acc.concat(glob.sync(PathLib.join(folderPath, path)))
  }, filters)
}
