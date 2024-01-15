#!/usr/bin/env node
const { create, refund, deploy, remove, setDefault } = require("./index");
const { program } = require('commander');
program.version(require('./package.json').version);

program
    .option('-p, --privateKey', 'private key')
    .option('-a, --address', 'contract address')
    .option('-r, --rpc', 'provider url')
    .option('-f, --file', 'upload file path or name')
    .option('-c, --chainId', 'chain id')
    .option('-t, --type', 'uploader type');

program
    .command('create')
    .argument('<privateKey>')
    .argument('[chainId]')
    .argument('[rpc]')
    .description('deploy a flat directory contract')
    .action(create);

program
    .command('refund')
    .argument('<privateKey>')
    .argument('<address>')
    .argument('[rpc]')
    .description('refund stake token')
    .action(refund);

program
    .command('default')
    .argument('<privateKey>')
    .argument('<address>')
    .argument('<file>')
    .argument('[rpc]')
    .description('set the default file for flat directory')
    .action(setDefault);

program
    .command('remove')
    .argument('<privateKey>')
    .argument('<address>')
    .argument('<file>')
    .argument('[rpc]')
    .description('set the default file for flat directory')
    .action(remove);

program
    .command('deploy')
    .argument('[privateKey]')
    .argument('[address]')
    .argument('[file]')
    .argument('[rpc]')
    .argument('[type]')
    .description('set the default file for flat directory')
    .action(deploy);

program.parse(process.argv);
