#!/usr/bin/env node
const { create, refund, deploy, remove, setDefault, download } = require("./index");
const { program } = require('commander');
program.version(require('./package.json').version);

program
    .argument('<name>')
    .option('-p, --privateKey <privateKey>', 'private key')
    .option('-a, --address [address]', 'contract address')
    .option('-r, --rpc [rpc]', 'provider url')
    .option('-f, --file [file]', 'upload file path or name')
    .option('-c, --chainId [chainId]', 'chain id')
    .option('-t, --type [type]', 'uploader type')
    .option('-s, --savePath [savePath]', 'save file path')
    .action((name, opts) => {
        if (name === 'create') {
            create(opts.privateKey, opts.chainId, opts.rpc);
        } else if (name === 'refund') {
            refund(opts.privateKey, opts.address, opts.rpc);
        } else if (name === 'default') {
            setDefault(opts.privateKey, opts.address, opts.file, opts.rpc);
        } else if (name === 'remove') {
            remove(opts.privateKey, opts.address, opts.file, opts.rpc);
        } else if(name === 'download') {
            download(opts.address, opts.file, opts.savePath, opts.rpc);
        } else if (name === 'deploy') {
            deploy(opts.privateKey, opts.address, opts.file, opts.rpc, opts.type);
        }
    });

program.parse(process.argv);
