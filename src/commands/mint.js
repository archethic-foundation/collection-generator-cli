import fs from "fs";
import chalk from "chalk";
import Archethic, { Utils, Crypto } from "@archethicjs/sdk";
import yesno from "yesno";

const command = "mint";

const describe = "Mint a collection on Archethic Network";

const builder = {
  seed: {
    describe:
      "Seed is a string representing the transaction chain entropy to be able to derive and generate the keys for the transactions",
    demandOption: true,
    type: "string",
    alias: "s",
  },
  endpoint: {
    describe:
      "Endpoint is the URL of a welcome node to receive the transaction",
    demandOption: true,
    type: "string",
    alias: "e",
  },
  "build-path": {
    describe: "Path to the build folder",
    demandOption: false,
    type: "string",
    alias: "b",
    default: `./build`,
  },
};

const handler = async function (argv) {
  const endpoint = argv.endpoint;
  const seed = argv.seed;
  const buildFolderPath = argv["build-path"];

  const archethic = new Archethic(endpoint);
  if (!fs.existsSync(`${buildFolderPath}/json/_metadata.json`)) {
    console.log(
      chalk.red(
        `Could not find metadata file at ${buildFolderPath}/json/_metadata.json, please check the path and try again.`
      )
    );
    process.exit(1);
  }
  let content = fs
    .readFileSync(`${buildFolderPath}/json/_metadata.json`)
    .toString("utf-8");
  archethic
    .connect()
    .then(async () => {
      const address = Crypto.deriveAddress(argv.seed, 0);

      const txIndex = await archethic.transaction.getTransactionIndex(address);

      const tx = archethic.transaction
        .new()
        .setType("token")
        .setContent(content)
        .build(seed, txIndex)
        .originSign(Utils.originPrivateKey);

      const { fee, rates } = await archethic.transaction.getTransactionFee(tx);

      const fees = Utils.fromBigInt(fee);

      const ok = await validFees(fees, rates);

      if (ok) {
        tx.on("error", (context, reason) => {
          console.log(chalk.red(reason));
          process.exit(1);
        })
          .on("requiredConfirmation", () => {
            console.log(
              chalk.green(
                `Congratulations you have successfully minted NFT collection - (${Utils.uint8ArrayToHex(
                  tx.address
                )})`
              )
            );
            process.exit(0);
          })
          .send(60);
      }
    })
    .catch((err) => {
      console.log(chalk.red(err));
      process.exit(1);
    });
};

async function validFees(fees, rates) {
  console.log(
    chalk.yellowBright(
      "Total Fee Requirement would be : " +
      fees +
      " UCO ( $ " +
      (rates.usd * fees).toFixed(2) +
      " | € " +
      (rates.eur * fees).toFixed(2) +
      ")"
    )
  );

  return await yesno({
    question: chalk.yellowBright("Do you want to continue. (yes/no)"),
  });
}

export default {
  command,
  describe,
  builder,
  handler,
};
