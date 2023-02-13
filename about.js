const chalk = require('chalk');

const figlet = require('figlet')

const command = 'about'

const describe = 'Welcome to Archethic Collection Generator'

const handler = function () {

        console.log(chalk.hex('#CC00FF')('\n', 'Hello and Welcome to Collection Generator CLI !', '\n')),
        console.log('\n'),
        console.log(chalk.hex('#00A4DB')(figlet.textSync('NFT GENERATOR', {
            font: "Big Money-ne"
        }))),
        console.log(chalk.hex('#CC00FF')('\n', 'Create your NFT Collection on top of Archethic Public Blockchain')),
        console.log('\n')

}

module.exports = {
    command,
    describe,
    handler
}