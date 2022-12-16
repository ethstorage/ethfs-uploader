#!/usr/bin/env node
const args = require('minimist')(
  process.argv.slice(2),
  {
    string: ['_', 'address', 'privateKey', 'RPC', 'chainId', 'file']
  }
);

const { create, refund, deploy, remove, setDefault } = require("./index");
if (args.create) {
  create(args.privateKey, args.chainId, args.RPC);
} else if(args.refund) {
  refund(args.address, args.privateKey, args.RPC);
} else if(args.default) {
  setDefault(args.address, args.file, args.privateKey, args.RPC);
} else if (args.remove) {
  remove(args.address, args.file, args.privateKey, args.RPC)
} else {
  if (args.privateKey) {
    deploy(args._[0], args._[1], args.privateKey, args.RPC);
  } else {
    deploy(args._[0], args._[1], args._[2], args.RPC);
  }
}
