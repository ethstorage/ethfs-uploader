const fs = require('fs');
const { ethers, ContractFactory } = require("ethers");
const { normalize } = require('eth-ens-namehash');
const sha3 = require('js-sha3').keccak_256;
const { from, mergeMap } = require('rxjs');

const color = require('colors-cli/safe')
const error = color.red.bold;
const notice = color.blue;

const nsAbi = [
  "function pointerOf(bytes memory name) public view returns (address)",
  "function resolver(bytes32 node) public view returns (address)",
];
const resolverAbi = [
  "function webHandler(bytes32 node) external view returns (address)",
  "function text(bytes32 node, string calldata key) external view returns (string memory)"
];
const fileAbi = [
  "function write(bytes memory filename, bytes memory data) public payable",
  "function writeChunk(bytes memory name, uint256 chunkId, bytes memory data) public payable",
  "function files(bytes memory filename) public view returns (bytes memory)",
  "function setDefault(bytes memory _defaultFile) public",
  "function refund() public",
  "function remove(bytes memory name) external returns (uint256)",
  "function countChunks(bytes memory name) external view returns (uint256)",
  "function getChunkHash(bytes memory name, uint256 chunkId) public view returns (bytes32)"
];

const factoryAbi = [
  "event FlatDirectoryCreated(address)",
  "function create() public returns (address)"
];
const flatDirectoryAbi = [
  "constructor(uint8 slotLimit)",
  "function changeOwner(address newOwner) public"
];

const SHORT_NAME_GALILEO = "w3q-g";
const SHORT_NAME_ETHEREUM = "eth";
const SHORT_NAME_GOERLI = "gor";
const SHORT_NAME_SEPOLIA = "sep";
const SHORT_NAME_OPTIMISTIC = "oeth";
const SHORT_NAME_ARBITRUM = "arb1";
const SHORT_NAME_OPTIMISTIC_GOERLI = "ogor";
const SHORT_NAME_ARBITRUM_GOERLI = "arb-goerli";
const SHORT_NAME_EVMOS = "evmos";
const SHORT_NAME_EVMOS_TEST = "evmos-testnet";
const SHORT_NAME_ARBITRUM_NOVE = "arb-nova";
const SHORT_NAME_BINANCE = "bnb";
const SHORT_NAME_BINANCE_TEST = "bnbt";
const SHORT_NAME_AVALANCHE = "avax";
const SHORT_NAME_AVALANCHE_TEST = "fuji";
const SHORT_NAME_FANTOM = "ftm";
const SHORT_NAME_FANTOM_TEST = "tftm";
const SHORT_NAME_HARMONY = "hmy-s0";
const SHORT_NAME_HARMONY_TEST = "hmy-b-s0";
const SHORT_NAME_POLYGON = "matic";
const SHORT_NAME_POLYGON_MUMBAI = "maticmum";
const SHORT_NAME_POLYGON_ZKEVM_TEST = "zkevmtest";
const SHORT_NAME_QUARKCHAIN = "qkc-s0";
const SHORT_NAME_QUARKCHAIN_DEVNET = "qkc-d-s0";

const GALILEO_CHAIN_ID = 3334;
const ETHEREUM_CHAIN_ID = 1;
const GOERLI_CHAIN_ID = 5;
const SEPOLIA_CHAIN_ID = 11155111;
const OPTIMISTIC_CHAIN_ID = 10;
const ARBITRUM_CHAIN_ID = 42161;
const OPTIMISTIC_GOERLI_CHAIN_ID = 420;
const ARBITRUM_GOERLI_CHAIN_ID = 421613;
const EVMOS_CHAIN_ID = 9001;
const EVMOS_TEST_CHAIN_ID = 9000;
const ARBITRUM_NOVE_CHAIN_ID = 42170;
const BINANCE_CHAIN_ID = 56;
const BINANCE_TEST_CHAIN_ID = 97;
const AVALANCHE_CHAIN_ID = 43114;
const AVALANCHE_TEST_CHAIN_ID = 43113;
const FANTOM_CHAIN_ID = 250;
const FANTOM_TEST_CHAIN_ID = 4002;
const HARMONY_CHAIN_ID = 1666600000;
const HARMONY_TEST_CHAIN_ID = 1666700000;
const POLYGON_CHAIN_ID = 137;
const POLYGON_MUMBAI_CHAIN_ID = 80001;
const POLYGON_ZKEVM_TEST_CHAIN_ID = 1402;
const QUARKCHAIN_CHAIN_ID = 100001;
const QUARKCHAIN_DEVNET_CHAIN_ID = 110001;

const NETWORK_MAPING = {
  [SHORT_NAME_GALILEO]: GALILEO_CHAIN_ID,
  [SHORT_NAME_ETHEREUM]: ETHEREUM_CHAIN_ID,
  [SHORT_NAME_GOERLI]: GOERLI_CHAIN_ID,
  [SHORT_NAME_SEPOLIA]: SEPOLIA_CHAIN_ID,
  [SHORT_NAME_OPTIMISTIC]: OPTIMISTIC_CHAIN_ID,
  [SHORT_NAME_ARBITRUM]: ARBITRUM_CHAIN_ID,
  [SHORT_NAME_OPTIMISTIC_GOERLI]: OPTIMISTIC_GOERLI_CHAIN_ID,
  [SHORT_NAME_ARBITRUM_GOERLI]: ARBITRUM_GOERLI_CHAIN_ID,
  [SHORT_NAME_EVMOS]: EVMOS_CHAIN_ID,
  [SHORT_NAME_EVMOS_TEST]: EVMOS_TEST_CHAIN_ID,
  [SHORT_NAME_ARBITRUM_NOVE]: ARBITRUM_NOVE_CHAIN_ID,
  [SHORT_NAME_BINANCE]: BINANCE_CHAIN_ID,
  [SHORT_NAME_BINANCE_TEST]: BINANCE_TEST_CHAIN_ID,
  [SHORT_NAME_AVALANCHE]: AVALANCHE_CHAIN_ID,
  [SHORT_NAME_AVALANCHE_TEST]: AVALANCHE_TEST_CHAIN_ID,
  [SHORT_NAME_FANTOM]: FANTOM_CHAIN_ID,
  [SHORT_NAME_FANTOM_TEST]: FANTOM_TEST_CHAIN_ID,
  [SHORT_NAME_HARMONY]: HARMONY_CHAIN_ID,
  [SHORT_NAME_HARMONY_TEST]: HARMONY_TEST_CHAIN_ID,
  [SHORT_NAME_POLYGON]: POLYGON_CHAIN_ID,
  [SHORT_NAME_POLYGON_MUMBAI]: POLYGON_MUMBAI_CHAIN_ID,
  [SHORT_NAME_POLYGON_ZKEVM_TEST]: POLYGON_ZKEVM_TEST_CHAIN_ID,
  [SHORT_NAME_QUARKCHAIN]: QUARKCHAIN_CHAIN_ID,
  [SHORT_NAME_QUARKCHAIN_DEVNET]: QUARKCHAIN_DEVNET_CHAIN_ID,
}

const PROVIDER_URLS = {
  [GALILEO_CHAIN_ID]: 'https://galileo.web3q.io:8545',
  [ETHEREUM_CHAIN_ID]: 'https://ethereum.publicnode.com',
  [GOERLI_CHAIN_ID]: 'https://rpc.ankr.com/eth_goerli',
  [SEPOLIA_CHAIN_ID]: 'https://rpc.sepolia.org',
  [OPTIMISTIC_CHAIN_ID]: 'https://mainnet.optimism.io',
  [ARBITRUM_CHAIN_ID]: 'https://arb1.arbitrum.io/rpc',
  [OPTIMISTIC_GOERLI_CHAIN_ID]: 'https://goerli.optimism.io',
  [ARBITRUM_GOERLI_CHAIN_ID]: 'https://goerli-rollup.arbitrum.io/rpc',
  [EVMOS_CHAIN_ID]: 'https://evmos-evm.publicnode.com',
  [EVMOS_TEST_CHAIN_ID]: 'https://eth.bd.evmos.dev:8545',
  [ARBITRUM_NOVE_CHAIN_ID]: 'https://nova.arbitrum.io/rpc',
  [BINANCE_CHAIN_ID]: 'https://bsc-dataseed2.binance.org',
  [BINANCE_TEST_CHAIN_ID]: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  [AVALANCHE_CHAIN_ID]: 'https://api.avax.network/ext/bc/C/rpc',
  [AVALANCHE_TEST_CHAIN_ID]: 'https://avalanchetestapi.terminet.io/ext/bc/C/rpc',
  [FANTOM_CHAIN_ID]: 'https://rpcapi.fantom.network',
  [FANTOM_TEST_CHAIN_ID]: 'https://rpc.testnet.fantom.network',
  [HARMONY_CHAIN_ID]: 'https://a.api.s0.t.hmny.io',
  [HARMONY_TEST_CHAIN_ID]: 'https://api.s0.b.hmny.io',
  [POLYGON_CHAIN_ID]: 'https://polygon-rpc.com',
  [POLYGON_MUMBAI_CHAIN_ID]: 'https://matic-mumbai.chainstacklabs.com',
  [POLYGON_ZKEVM_TEST_CHAIN_ID]: 'https://rpc.public.zkevm-test.net',
  [QUARKCHAIN_CHAIN_ID]: 'https://mainnet-s0-ethapi.quarkchain.io',
  [QUARKCHAIN_DEVNET_CHAIN_ID]: 'https://devnet-s0-ethapi.quarkchain.io',
}
const NS_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0xD379B91ac6a93AF106802EB076d16A54E3519CED',
  [ETHEREUM_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [GOERLI_CHAIN_ID]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
}
const FACTORY_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0xA99589A04517d585861ce77c10a3EeE99f70B69a',
}

const REMOVE_FAIL = -1;
const REMOVE_NORMAL = 0;
const REMOVE_SUCCESS = 1;

const CHAIN_ID_DEFAULT = ETHEREUM_CHAIN_ID;

let nonce;

const getNonce = () => {
  return nonce++;
}

// **** utils ****
function namehash(inputName) {
  let node = ''
  for (let i = 0; i < 32; i++) {
    node += '00'
  }

  if (inputName) {
    const labels = inputName.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      let normalisedLabel = normalize(labels[i])
      let labelSha = sha3(normalisedLabel)
      node = sha3(Buffer.from(node + labelSha, 'hex'))
    }
  }

  return '0x' + node
}

async function getChainIdByRpc(rpc) {
  if (!rpc) {
    return;
  }
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const network = await provider.getNetwork();
  return network.chainId;
}

// return address or eip3770 address
async function getWebHandler(domain, RPC, chainId) {
  // get web handler address, domain is address, xxx.ens, xxx.w3q

  // get chain id by short name
  let snChainId;
  let address;
  const domains = domain.split(":");
  if (domains.length > 1) {
    const shortName = domains[0];
    snChainId = NETWORK_MAPING[shortName];
    if (!snChainId) {
      console.error(error(`ERROR: invalid shortName=${shortName} network.`));
      return;
    }
    address = domains[1];
  } else {
    address = domain;
  }

  // get rpc chain id
  const rpcChainId = await getChainIdByRpc(RPC);

  // get chain id
  if (chainId) {
    chainId = Number(chainId);
    if (snChainId && chainId !== snChainId) {
      console.error(error(`ERROR: chainId(${chainId}) and short name chainId(${snChainId}) conflict.`));
      return;
    }
    if (rpcChainId && chainId !== rpcChainId) {
      console.error(error(`ERROR: chainId(${chainId}) and rpc chainId(${rpcChainId}) conflict.`));
      return;
    }
  } else if (snChainId) {
    if (rpcChainId && snChainId !== rpcChainId) {
      console.error(error(`ERROR: short name chainId(${snChainId}) and rpc chainId(${rpcChainId}) conflict.`));
      return;
    }
    chainId = snChainId;
  } else if (rpcChainId) {
    chainId = rpcChainId;
  } else {
    chainId = CHAIN_ID_DEFAULT;
    if (address.endsWith(".w3q")) {
      chainId = GALILEO_CHAIN_ID;
    }
  }

  // get rpc
  let providerUrl = RPC ?? PROVIDER_URLS[chainId];
  if (!providerUrl) {
    console.error(error(`ERROR: The network(${chainId}) need RPC, please try again after setting RPC!`));
    return;
  }
  console.log(`providerUrl = ${providerUrl}\nchainId = ${chainId}\naddress: ${address}\n`);

  // address
  const ethAddrReg = /^0x[0-9a-fA-F]{40}$/;
  if (ethAddrReg.test(address)) {
    return {providerUrl, chainId, address};
  }

  // .w3q or .eth domain
  let nameServiceContract = NS_ADDRESS[chainId];
  if(!nameServiceContract) {
    console.log(error(`Not Support Name Service: ${domain}`));
    return;
  }
  let webHandler;
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  try {
    const nameHash = namehash(address);
    const wnsContract = new ethers.Contract(nameServiceContract, nsAbi, provider);
    const resolver = await wnsContract.resolver(nameHash);
    const resolverContract = new ethers.Contract(resolver, resolverAbi, provider);
    if (chainId === GALILEO_CHAIN_ID) {
      webHandler = await resolverContract.webHandler(nameHash);
    } else {
      webHandler = await resolverContract.text(nameHash, "contentcontract");
    }
  } catch (e){
    console.log(error(`Not Support Domain: ${domain}`));
    return;
  }

  // address
  if (ethAddrReg.test(webHandler)) {
    return {providerUrl, chainId, address: webHandler};
  }
  const short = webHandler.split(":");
  let shortAdd, shortName;
  if (short.length > 1) {
    shortName = domains[0];
    shortAdd = domains[1];
  } else {
    console.error(error(`ERROR: invalid web handler=${webHandler}.`));
    return;
  }
  const newChainId = NETWORK_MAPING[shortName];
  providerUrl = chainId === newChainId ? providerUrl : PROVIDER_URLS[newChainId];
  return {
    providerUrl: providerUrl,
    chainId: newChainId,
    address: shortAdd
  };
}

const getTxReceipt = async (fileContract, transactionHash) => {
  const provider = fileContract.provider;
  let txReceipt;
  while (!txReceipt) {
    txReceipt = await isTransactionMined(provider, transactionHash);
    await sleep(5000);
  }
  return txReceipt;
}

const isTransactionMined = async (provider, transactionHash) => {
  const txReceipt = await provider.getTransactionReceipt(transactionHash);
  if (txReceipt && txReceipt.blockNumber) {
    return txReceipt;
  }
}

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const bufferChunk = (buffer, chunkSize) => {
  let i = 0;
  let result = [];
  const len = buffer.length;
  const chunkLength = Math.ceil(len / chunkSize);
  while (i < len) {
    result.push(buffer.slice(i, i += chunkLength));
  }

  return result;
}

const recursiveFiles = (path, basePath) => {
  let filePools = [];
  const fileStat = fs.statSync(path);
  if (fileStat.isFile()) {
    filePools.push({path: path, name: path.substring(path.lastIndexOf("/") + 1), size: fileStat.size});
    return filePools;
  }

  const files = fs.readdirSync(path);
  for (let file of files) {
    const fileStat = fs.statSync(`${path}/${file}`);
    if (fileStat.isDirectory()) {
      const pools = recursiveFiles(`${path}/${file}`, `${basePath}${file}/`);
      filePools = filePools.concat(pools);
    } else {
      filePools.push({path: `${path}/${file}`, name: `${basePath}${file}`, size: fileStat.size});
    }
  }
  return filePools;
};

const uploadFile = async (chainId, fileContract, fileInfo) => {
  const {path, name, size} = fileInfo;
  const filePath = path;
  const fileName = name;
  let fileSize = size;

  const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');
  const content = fs.readFileSync(filePath);
  let chunks = [];
  if (chainId === GALILEO_CHAIN_ID) {
    // Data need to be sliced if file > 475K
    if (fileSize > 475 * 1024) {
      const chunkSize = Math.ceil(fileSize / (475 * 1024));
      chunks = bufferChunk(content, chunkSize);
      fileSize = fileSize / chunkSize;
    } else {
      chunks.push(content);
    }
  } else {
    // Data need to be sliced if file > 24K
    if (fileSize > 24 * 1024 - 326) {
      const chunkSize = Math.ceil(fileSize / (24 * 1024 - 326));
      chunks = bufferChunk(content, chunkSize);
      fileSize = fileSize / chunkSize;
    } else {
      chunks.push(content);
    }
  }

  const clearState = await clearOldFile(fileContract, fileName, hexName, chunks.length);
  if (clearState === REMOVE_FAIL) {
    return {upload: 0, fileName: fileName};
  }

  let cost = 0;
  if ((chainId === GALILEO_CHAIN_ID) && (fileSize > 24 * 1024 - 326)) {
    // eth storage need stake
    cost = Math.floor((fileSize + 326) / 1024 / 24);
  }

  let uploadCount = 0;
  const failFile = [];
  for (const index in chunks) {
    const chunk = chunks[index];
    const hexData = '0x' + chunk.toString('hex');

    if (clearState === REMOVE_NORMAL) {
      // check is change
      const localHash = '0x' + sha3(chunk);
      let hash;
      try {
        hash = await fileContract.getChunkHash(hexName, index);
      } catch (e) {
        await sleep(3000);
        hash = await fileContract.getChunkHash(hexName, index);
      }
      if (localHash === hash) {
        console.log(`File ${fileName} chunkId: ${index}: The data is not changed.`);
        continue;
      }
    }

    let estimatedGas;
    try {
      estimatedGas = await fileContract.estimateGas.writeChunk(hexName, index, hexData, {
        value: ethers.utils.parseEther(cost.toString())
      });
    } catch (e) {
      await sleep(3000);
      estimatedGas = await fileContract.estimateGas.writeChunk(hexName, index, hexData, {
        value: ethers.utils.parseEther(cost.toString())
      });
    }

    // upload file
    const option = {
      nonce: getNonce(),
      gasLimit: estimatedGas.mul(6).div(5).toString(),
      value: ethers.utils.parseEther(cost.toString())
    };
    let tx;
    try {
      tx = await fileContract.writeChunk(hexName, index, hexData, option);
    } catch (e) {
      await sleep(5000);
      tx = await fileContract.writeChunk(hexName, index, hexData, option);
    }
    console.log(`${fileName}, chunkId: ${index}`);
    console.log(`Transaction Id: ${tx.hash}`);

    // get result
    let txReceipt;
    try {
      txReceipt = await getTxReceipt(fileContract, tx.hash);
    } catch (e) {}
    if (txReceipt && txReceipt.status) {
      console.log(`File ${fileName} chunkId: ${index} uploaded!`);
      uploadCount++;
    } else {
      failFile.push(index);
      break;
    }
  }

  return {
    upload: 1,
    fileName: fileName,
    cost: cost,
    fileSize: fileSize / 1024,
    uploadCount: uploadCount,
    failFile: failFile
  };
};

const removeFile = async (fileContract, fileName, hexName) => {
  const estimatedGas = await fileContract.estimateGas.remove(hexName);
  const option = {
    nonce: getNonce(),
    gasLimit: estimatedGas.mul(6).div(5).toString()
  };
  let tx;
  try {
    tx = await fileContract.remove(hexName, option);
  } catch (e) {
    await sleep(3000);
    tx = await fileContract.remove(hexName, option);
  }
  console.log(`Remove Transaction Id: ${tx.hash}`);
  const receipt = await getTxReceipt(fileContract, tx.hash);
  if (receipt.status) {
    console.log(`Remove file: ${fileName} succeeded`);
    return REMOVE_SUCCESS;
  } else {
    console.log(`Failed to remove file: ${fileName}`);
    return REMOVE_FAIL;
  }
}

const clearOldFile = async (fileContract, fileName, hexName, chunkLength) => {
  let oldChunkLength;
  try {
    oldChunkLength = await fileContract.countChunks(hexName);
  } catch (e) {
    await sleep(3000);
    oldChunkLength = await fileContract.countChunks(hexName);
  }

  if (oldChunkLength > chunkLength) {
    // remove
    return removeFile(fileContract, fileName, hexName);
  }
  return REMOVE_NORMAL;
}
// **** utils ****
const checkBalance = async (provider, domainAddr, accountAddr) => {
  return Promise.all([provider.getBalance(domainAddr), provider.getBalance(accountAddr)]).then(values => {
    return {
      domainBalance: values[0],
      accountBalance: values[1]
    };
  }, reason => {
    console.log(reason);
  });
}

// **** function ****
const remove = async (domain, fileName, key, RPC, chain) => {
  const {providerUrl, address} = await getWebHandler(domain, RPC, chain);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    let prevInfo;
    await checkBalance(provider, address, wallet.address).then(info => {
      prevInfo = info;
    })
    nonce = await wallet.getTransactionCount("pending");
    console.log(`Removing file ${fileName}`);
    const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');
    await removeFile(fileContract, fileName, hexName);
    await checkBalance(provider, address, wallet.address).then(info => {
      console.log(`domainBalance: ${info.domainBalance}, accountBalance: ${info.accountBalance}, 
        balanceChange: ${prevInfo.accountBalance - info.accountBalance}`);
    })
  }
}

const deploy = async (path, domain, key, RPC, chain) => {
  const {providerUrl, chainId, address} = await getWebHandler(domain, RPC, chain);
  if (providerUrl && parseInt(address) > 0) {
    let syncPoolSize = 15;
    if (chainId === ARBITRUM_NOVE_CHAIN_ID) {
      syncPoolSize = 4;
    }
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    nonce = await wallet.getTransactionCount("pending");

    let failPool = [];
    let totalCost = 0, totalFileCount = 0, totalFileSize = 0;
    // get file and remove old chunk
    console.log("Start upload File.......");
    from(recursiveFiles(path, ''))
        .pipe(mergeMap(info => uploadFile(chainId, fileContract, info), syncPoolSize))
        // .returnValue()
        .subscribe(
            (info) => {
              if (info.upload === 1) {
                if (info.failFile && info.failFile.length > 0) {
                  for (const index of info.failFile) {
                    failPool.push(info.fileName + " Chunk:" + index);
                  }
                }
                totalFileCount += info.uploadCount;
                totalCost += info.uploadCount * info.cost;
                totalFileSize += info.uploadCount * info.fileSize;
              } else {
                failPool.push(info.fileName);
              }
            },
            (error) => {
              throw error
            },
            () => {
              if (failPool.length > 0) {
                console.log();
                for (const file of failPool) {
                  console.log(error(`ERROR: ${file} uploaded failed.`));
                }
              }
              console.log();
              console.log(notice(`Total Cost: ${totalCost} W3Q`));
              console.log(notice(`Total File Count: ${totalFileCount}`));
              console.log(notice(`Total File Size: ${totalFileSize} KB`));
            });
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const createDirectory = async (key, chain = CHAIN_ID_DEFAULT, RPC) => {
  if (FACTORY_ADDRESS[chain]) {
    // Galileo
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chain]);
    const wallet = new ethers.Wallet(key, provider);

    const factoryAddress = FACTORY_ADDRESS[chain];
    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);
    const tx = await factoryContract.create();
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt = await tx.wait();
    if (txReceipt.status) {
      let iface = new ethers.utils.Interface(factoryAbi);
      let log = iface.parseLog(txReceipt.logs[0]);
      console.log(`FlatDirectory Address: ${log.args[0]}`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    // other network
    const providerUrl = RPC ?? PROVIDER_URLS[chain];
    if (!providerUrl) {
      console.error(error(`ERROR: The network=${chain} need RPC, please try again after setting RPC!`));
      return;
    }

    const contractByteCode = '0x60c0604052600060a09081526003906200001a90826200010e565b503480156200002857600080fd5b5060405162001fe138038062001fe18339810160408190526200004b91620001da565b60ff16608052600280546001600160a01b0319163317905562000206565b634e487b7160e01b600052604160045260246000fd5b600181811c908216806200009457607f821691505b602082108103620000b557634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200010957600081815260208120601f850160051c81016020861015620000e45750805b601f850160051c820191505b818110156200010557828155600101620000f0565b5050505b505050565b81516001600160401b038111156200012a576200012a62000069565b62000142816200013b84546200007f565b84620000bb565b602080601f8311600181146200017a5760008415620001615750858301515b600019600386901b1c1916600185901b17855562000105565b600085815260208120601f198616915b82811015620001ab578886015182559484019460019091019084016200018a565b5085821015620001ca5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b600060208284031215620001ed57600080fd5b815160ff81168114620001ff57600080fd5b9392505050565b608051611db862000229600039600081816104010152610b5a0152611db86000f3fe6080604052600436106200012e5760003560e01c806358edef4c11620000af578063a6f9dae1116200006d578063a6f9dae114620004f9578063caf12836146200051e578063d84eb56c1462000559578063dd473fae146200057e578063f916c5b0146200059c576200012e565b806358edef4c1462000437578063590e1ae3146200045c5780635ba1d9e514620004745780638bf4515c14620004995780638da5cb5b14620004be576200012e565b80631c993ad511620000fd5780631c993ad514620003695780632b68b9c6146200038e57806342216bed14620003a6578063492c7b2a14620003da5780634eed7cf114620003f1576200012e565b8063038cd79f14620002b05780630936286114620002c95780631a7237e014620002f95780631c5ee10c146200032e575b3480156200013b57600080fd5b5060003660608082840362000161575050604080516020810190915260008152620002a5565b838360008181106200017757620001776200153e565b9050013560f81c60f81b6001600160f81b031916602f60f81b14620001c357505060408051808201909152600e81526d0d2dcc6dee4e4cac6e840e0c2e8d60931b6020820152620002a5565b8383620001d26001826200156a565b818110620001e457620001e46200153e565b909101356001600160f81b031916602f60f81b03905062000246576200023d62000212846001818862001580565b60036040516020016200022893929190620015e2565b604051602081830303815290604052620005c1565b50905062000298565b6200029462000259846001818862001580565b8080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250620005c192505050565b5090505b620002a381620005e0565b505b915050805190602001f35b620002c7620002c13660046200175f565b62000621565b005b348015620002d657600080fd5b50620002e162000673565b604051620002f0919062001823565b60405180910390f35b3480156200030657600080fd5b506200031e6200031836600462001838565b62000709565b604051620002f092919062001881565b3480156200033b57600080fd5b50620003536200034d366004620018a7565b6200072c565b60408051928352602083019190915201620002f0565b3480156200037657600080fd5b50620002c762000388366004620018a7565b62000741565b3480156200039b57600080fd5b50620002c762000780565b348015620003b357600080fd5b50620003cb620003c536600462001838565b620007bb565b604051908152602001620002f0565b620002c7620003eb366004620018e8565b620007dd565b348015620003fe57600080fd5b507f000000000000000000000000000000000000000000000000000000000000000060ff1615155b6040519015158152602001620002f0565b3480156200044457600080fd5b50620003cb62000456366004620018a7565b62000826565b3480156200046957600080fd5b50620002c76200086a565b3480156200048157600080fd5b50620004266200049336600462001838565b620008d4565b348015620004a657600080fd5b506200031e620004b8366004620018a7565b620005c1565b348015620004cb57600080fd5b50600254620004e0906001600160a01b031681565b6040516001600160a01b039091168152602001620002f0565b3480156200050657600080fd5b50620002c7620005183660046200195f565b6200091e565b3480156200052b57600080fd5b50620005436200053d36600462001838565b6200096d565b60408051928352901515602083015201620002f0565b3480156200056657600080fd5b50620003cb6200057836600462001838565b62000983565b3480156200058b57600080fd5b50651b585b9d585b60d21b620003cb565b348015620005a957600080fd5b50620003cb620005bb366004620018a7565b620009c6565b60606000620005d78380519060200120620009da565b91509150915091565b600081516040620005f291906200198a565b9050601f19620006048260206200198a565b6200061190601f6200198a565b1690506020808303528060208303f35b6002546001600160a01b03163314620006575760405162461bcd60e51b81526004016200064e90620019a0565b60405180910390fd5b6200066e8380519060200120600084843462000b4a565b505050565b600380546200068290620015ac565b80601f0160208091040260200160405190810160405280929190818152602001828054620006b090620015ac565b8015620007015780601f10620006d55761010080835404028352916020019162000701565b820191906000526020600020905b815481529060010190602001808311620006e357829003601f168201915b505050505081565b606060006200072084805190602001208462000c34565b915091505b9250929050565b600080620005d7838051906020012062000cad565b6002546001600160a01b031633146200076e5760405162461bcd60e51b81526004016200064e90620019a0565b60036200077c828262001a1b565b5050565b6002546001600160a01b03163314620007ad5760405162461bcd60e51b81526004016200064e90620019a0565b6002546001600160a01b0316ff5b600080620007ca848462000709565b5080516020909101209150505b92915050565b6002546001600160a01b031633146200080a5760405162461bcd60e51b81526004016200064e90620019a0565b6200082084805190602001208484843462000b4a565b50505050565b6002546000906001600160a01b03163314620008565760405162461bcd60e51b81526004016200064e90620019a0565b620007d78280519060200120600062000d04565b6002546001600160a01b03163314620008975760405162461bcd60e51b81526004016200064e90620019a0565b6002546040516001600160a01b03909116904780156108fc02916000818181858888f19350505050158015620008d1573d6000803e3d6000fd5b50565b6002546000906001600160a01b03163314620009045760405162461bcd60e51b81526004016200064e90620019a0565b6200091783805190602001208362000dcc565b9392505050565b6002546001600160a01b031633146200094b5760405162461bcd60e51b81526004016200064e90620019a0565b600280546001600160a01b0319166001600160a01b0392909216919091179055565b6000806200072084805190602001208462000ebc565b6002546000906001600160a01b03163314620009b35760405162461bcd60e51b81526004016200064e90620019a0565b6200091783805190602001208362000d04565b6000620007d7828051906020012062000f14565b60606000806000620009ec8562000cad565b915091508060000362000a345760005b6040519080825280601f01601f19166020018201604052801562000a27576020820181803683370190505b5095600095509350505050565b60008267ffffffffffffffff81111562000a525762000a526200166f565b6040519080825280601f01601f19166020018201604052801562000a7d576020820181803683370190505b5090506020810160005b8381101562000b3b576000888152602081815260408083208484529091528120549062000ab48262000f53565b1562000af65762000ac58260e01c90565b60008b8152600160209081526040808320878452909152902090915062000aee90838662000f68565b505062000b15565b8162000b02816200101c565b50915062000b1181866200108e565b5050505b62000b2181856200198a565b93505050808062000b329062001ae8565b91505062000a87565b50909660019650945050505050565b62000b568585620010ed565b60ff7f00000000000000000000000000000000000000000000000000000000000000001682111562000bbd5762000b9f62000b9384848462001205565b6001600160a01b031690565b60008681526020818152604080832088845290915290205562000c2d565b60008581526001602090815260408083208784528252918290208251601f860183900483028101830190935284835262000c149290918690869081908401838280828437600092019190915250620012c192505050565b6000868152602081815260408083208884529091529020555b5050505050565b6000828152602081815260408083208484529091528120546060919062000c5b8162000f53565b1562000c95576000858152600160209081526040808320878452909152812062000c86908362001366565b93506001925062000725915050565b8062000ca18162001402565b93509350505062000725565b6000806000805b60008062000cc3878462000ebc565b915091508062000cd557505062000cfa565b62000ce182856200198a565b93508262000cef8162001ae8565b935050505062000cb4565b9094909350915050565b60005b6000838152602081815260408083208584529091529020548062000d2c575062000dc6565b62000d378162000f53565b62000d98576000819050806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b15801562000d7d57600080fd5b505af115801562000d92573d6000803e3d6000fd5b50505050505b6000848152602081815260408083208684529091528120558262000dbc8162001ae8565b9350505062000d07565b50919050565b6000828152602081815260408083208484529091528120548062000df5576000915050620007d7565b60008481526020819052604081208162000e118660016200198a565b8152602001908152602001600020541462000e31576000915050620007d7565b62000e3c8162000f53565b62000e9d576000819050806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b15801562000e8257600080fd5b505af115801562000e97573d6000803e3d6000fd5b50505050505b5050600091825260208281526040808420928452919052812055600190565b60008281526020818152604080832084845290915281205481908062000eea57600080925092505062000725565b62000ef58162000f53565b1562000f0857600062000c868260e01c90565b8062000ca1816200101c565b6000805b6000838152602081815260408083208484529091529020548062000f3d5750620007d7565b8162000f498162001ae8565b9250505062000f18565b60008062000f618360e01c90565b1192915050565b600080600062000f7885620014a9565b808652909350905083601c8411156200100e57601c81016000805b6020600162000fa4601c8a6200156a565b62000fb19060206200198a565b62000fbd91906200156a565b62000fc9919062001b04565b8110156200100a57600081815260208b8152604090912054808552925062000ff39084906200198a565b925080620010018162001ae8565b91505062000f93565b5050505b600192505050935093915050565b6000806001600160a01b0383166200103957506000928392509050565b600080604051806101600160405280610126815260200162001c5d6101269139519050843b91508082101562001076575060009485945092505050565b6200108281836200156a565b95600195509350505050565b6000806000806200109f866200101c565b9150915080620010b85760008093509350505062000725565b6000604051806101600160405280610126815260200162001c5d6101269139519050828187893c509095600195509350505050565b600082815260208181526040808320848452909152902054806200118957811580620011425750600083815260208190526040812081620011306001866200156a565b81526020019081526020016000205414155b620011895760405162461bcd60e51b81526020600482015260166024820152751b5d5cdd081c995c1b1858d9481bdc88185c1c195b9960521b60448201526064016200064e565b620011948162000f53565b6200066e57806001600160a01b038116156200082057806001600160a01b0316632b68b9c66040518163ffffffff1660e01b8152600401600060405180830381600087803b158015620011e657600080fd5b505af1158015620011fb573d6000803e3d6000fd5b5050505050505050565b600080604051806101600160405280610126815260200162001c5d610126913985856040516020016200123b9392919062001b27565b60408051601f19818403018152919052905060006200125d604360206200198a565b3083820152905062001272608c60206200198a565b9050308183015250600083826040516200128c9062001530565b62001298919062001823565b6040518091039082f0905080158015620012b6573d6000803e3d6000fd5b509695505050505050565b805160208083015160e083901b911c1790601c8111156200135f576000603c8401815b60206001620012f5601c876200156a565b620013029060206200198a565b6200130e91906200156a565b6200131a919062001b04565b8110156200135b5781519250620013338260206200198a565b6000828152602089905260409020849055915080620013528162001ae8565b915050620012e4565b5050505b5092915050565b606060006200137583620014c4565b92509050601c8111156200135f57603c82016000805b602060016200139c601c876200156a565b620013a99060206200198a565b620013b591906200156a565b620013c1919062001b04565b8110156200135b57600081815260208881526040909120548085529250620013eb9084906200198a565b925080620013f98162001ae8565b9150506200138b565b6060600080600062001414856200101c565b915091508062001426576000620009fc565b60008267ffffffffffffffff8111156200144457620014446200166f565b6040519080825280601f01601f1916602001820160405280156200146f576020820181803683370190505b5090506000604051806101600160405280610126815260200162001c5d6101269139519050838160208401893c5095600195509350505050565b600080620014b78360e01c90565b9360209390931b92915050565b60006060620014d38360e01c90565b9150602083901b92508167ffffffffffffffff811115620014f857620014f86200166f565b6040519080825280601f01601f19166020018201604052801562001523576020820181803683370190505b5060208101939093525091565b61010b8062001b5283390190565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b81810381811115620007d757620007d762001554565b600080858511156200159157600080fd5b838611156200159f57600080fd5b5050820193919092039150565b600181811c90821680620015c157607f821691505b60208210810362000dc657634e487b7160e01b600052602260045260246000fd5b8284823760008382016000815260008454620015fe81620015ac565b600182811680156200161957600181146200162f5762001660565b60ff198416865282151583028601945062001660565b8860005260208060002060005b8581101562001657578154898201529084019082016200163c565b50505082860194505b50929998505050505050505050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200169757600080fd5b813567ffffffffffffffff80821115620016b557620016b56200166f565b604051601f8301601f19908116603f01168101908282118183101715620016e057620016e06200166f565b81604052838152866020858801011115620016fa57600080fd5b836020870160208301376000602085830101528094505050505092915050565b60008083601f8401126200172d57600080fd5b50813567ffffffffffffffff8111156200174657600080fd5b6020830191508360208285010111156200072557600080fd5b6000806000604084860312156200177557600080fd5b833567ffffffffffffffff808211156200178e57600080fd5b6200179c8783880162001685565b94506020860135915080821115620017b357600080fd5b50620017c2868287016200171a565b9497909650939450505050565b60005b83811015620017ec578181015183820152602001620017d2565b50506000910152565b600081518084526200180f816020860160208601620017cf565b601f01601f19169290920160200192915050565b602081526000620009176020830184620017f5565b600080604083850312156200184c57600080fd5b823567ffffffffffffffff8111156200186457600080fd5b620018728582860162001685565b95602094909401359450505050565b604081526000620018966040830185620017f5565b905082151560208301529392505050565b600060208284031215620018ba57600080fd5b813567ffffffffffffffff811115620018d257600080fd5b620018e08482850162001685565b949350505050565b60008060008060608587031215620018ff57600080fd5b843567ffffffffffffffff808211156200191857600080fd5b620019268883890162001685565b95506020870135945060408701359150808211156200194457600080fd5b5062001953878288016200171a565b95989497509550505050565b6000602082840312156200197257600080fd5b81356001600160a01b03811681146200091757600080fd5b80820180821115620007d757620007d762001554565b6020808252600f908201526e36bab9ba10333937b69037bbb732b960891b604082015260600190565b601f8211156200066e57600081815260208120601f850160051c81016020861015620019f25750805b601f850160051c820191505b8181101562001a1357828155600101620019fe565b505050505050565b815167ffffffffffffffff81111562001a385762001a386200166f565b62001a508162001a498454620015ac565b84620019c9565b602080601f83116001811462001a88576000841562001a6f5750858301515b600019600386901b1c1916600185901b17855562001a13565b600085815260208120601f198616915b8281101562001ab95788860151825594840194600190910190840162001a98565b508582101562001ad85787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b60006001820162001afd5762001afd62001554565b5060010190565b60008262001b2257634e487b7160e01b600052601260045260246000fd5b500490565b6000845162001b3b818460208901620017cf565b820183858237600093019283525090939250505056fe608060405260405161010b38038061010b83398101604081905261002291610041565b80518060208301f35b634e487b7160e01b600052604160045260246000fd5b6000602080838503121561005457600080fd5b82516001600160401b038082111561006b57600080fd5b818501915085601f83011261007f57600080fd5b8151818111156100915761009161002b565b604051601f8201601f19908116603f011681019083821181831017156100b9576100b961002b565b8160405282815288868487010111156100d157600080fd5b600093505b828410156100f357848401860151818501870152928501926100d6565b60008684830101528096505050505050509291505056fe6080604052348015600f57600080fd5b506004361060325760003560e01c80632b68b9c61460375780638da5cb5b14603f575b600080fd5b603d6081565b005b60657f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b03909116815260200160405180910390f35b336001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161460ed5760405162461bcd60e51b815260206004820152600e60248201526d3737ba10333937b69037bbb732b960911b604482015260640160405180910390fd5b33fffea2646970667358221220fc66c9afb7cb2f6209ae28167cf26c6c06f86a82cbe3c56de99027979389a1be64736f6c63430008070033a2646970667358221220557770e8fd04a07876682165d92840bcc8b85879818a430ac4900016709817c064736f6c63430008110033';
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    const factory = new ContractFactory(flatDirectoryAbi, contractByteCode, wallet);
    const contract = await factory.deploy(0, {
      gasLimit: 3000000
    });
    await contract.deployed();
    if (contract) {
      console.log(`FlatDirectory Address: ${contract.address}`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  }
};

const refund = async (domain, key, RPC, chain) => {
  const {providerUrl, address} = await getWebHandler(domain, RPC, chain);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const estimatedGas = await fileContract.estimateGas.refund();
    const tx = await fileContract.refund({
      gasLimit: estimatedGas.mul(6).div(5).toString()
    });
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt;
    while (!txReceipt) {
      txReceipt = await isTransactionMined(provider, tx.hash);
      await sleep(5000);
    }
    if (txReceipt.status) {
      console.log(`Refund succeeds`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const setDefault = async (domain, filename, key, RPC, chain) => {
  const {providerUrl, address} = await getWebHandler(domain, RPC, chain);
  if (providerUrl && parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const defaultFile = '0x' + Buffer.from(filename, 'utf8').toString('hex');
    const estimatedGas = await fileContract.estimateGas.setDefault(defaultFile);
    const tx = await fileContract.setDefault(defaultFile, {
      gasLimit: estimatedGas.mul(6).div(5).toString()
    });
    console.log(`Transaction: ${tx.hash}`);
    let txReceipt;
    while (!txReceipt) {
      txReceipt = await isTransactionMined(provider, tx.hash);
      await sleep(5000);
    }
    if (txReceipt.status) {
      console.log(`Set succeeds`);
    } else {
      console.error(`ERROR: transaction failed!`);
    }
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};
// **** function ****

module.exports.deploy = deploy;
module.exports.create = createDirectory;
module.exports.refund = refund;
module.exports.remove = remove;
module.exports.setDefault = setDefault;
