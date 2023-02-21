import chalk from 'chalk';
import figlet from 'figlet';

const command = 'welcome';
const describe = 'Welcome to Archethic Collection Generator';
const handler = function () {
    console.log(chalk.hex('#CC00FF')('\n', 'Hello and Welcome to Collection Generator CLI !', '\n')),
    console.log('\n'),
    console.log(chalk.hex('#00A4DB')(figlet.textSync('NFT GENERATOR', {
        font: "Big Money-ne"
    }))),
    console.log(chalk.hex('#CC00FF')('\n', 'Create your NFT Collection on top of Archethic Public Blockchain')),
    console.log('\n');
}

export default {
    command,
    describe,
    handler
};
