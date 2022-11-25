const fs = require('fs');
const { ethers } = require("ethers");
const { normalize } = require('eth-ens-namehash');
const sha3 = require('js-sha3').keccak_256;
const { from, mergeMap } = require('rxjs');

const color = require('colors-cli/safe')
const error = color.red.bold;
const notice = color.blue;

const wnsAbi = [
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

const SHORT_NAME_GALILEO = "w3q-g";
const SHORT_NAME_ETHEREUM = "eth";
const SHORT_NAME_GOERLI = "gor";
const SHORT_NAME_SEPOLIA = "sep";
const SHORT_NAME_OPTIMISTIC = "oeth";
const SHORT_NAME_ARBITRUM = "arb1";
const SHORT_NAME_OPTIMISTIC_GOERLI = "ogor";
const SHORT_NAME_ARBITRUM_GOERLI = "arb-goerli";
const SHORT_NAME_EVMOS = "evmos";
const SHORT_NAME_ARBITRUM_NOVE = "arb-nova";

const GALILEO_CHAIN_ID = 3334;
const ETHEREUM_CHAIN_ID = 1;
const GOERLI_CHAIN_ID = 5;
const SEPOLIA_CHAIN_ID = 11155111;
const OPTIMISTIC_CHAIN_ID = 10;
const ARBITRUM_CHAIN_ID = 42161;
const OPTIMISTIC_GOERLI_CHAIN_ID = 420;
const ARBITRUM_GOERLI_CHAIN_ID = 421613;
const EVMOS_CHAIN_ID = 9001;
const ARBITRUM_NOVE_CHAIN_ID = 42170;
const DEVNET_CHAIN_ID = 1337;

const PROVIDER_URLS = {
  [GALILEO_CHAIN_ID]: 'https://galileo.web3q.io:8545',
  [GOERLI_CHAIN_ID]: 'https://rpc.ankr.com/eth_goerli',
  [SEPOLIA_CHAIN_ID]: 'https://rpc.sepolia.org',
  [OPTIMISTIC_CHAIN_ID]: 'https://mainnet.optimism.io',
  [ARBITRUM_CHAIN_ID]: 'https://arb1.arbitrum.io/rpc',
  [OPTIMISTIC_GOERLI_CHAIN_ID]: 'https://goerli.optimism.io',
  [ARBITRUM_GOERLI_CHAIN_ID]: 'https://goerli-rollup.arbitrum.io/rpc',
  [EVMOS_CHAIN_ID]: 'https://evmos-evm.publicnode.com',
  [ARBITRUM_NOVE_CHAIN_ID]: 'https://nova.arbitrum.io/rpc',
  [DEVNET_CHAIN_ID]: 'http://localhost:8545',
}
const W3NS_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0xD379B91ac6a93AF106802EB076d16A54E3519CED',
  [ETHEREUM_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [GOERLI_CHAIN_ID]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  [DEVNET_CHAIN_ID]: '',
}
const FACTORY_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0x1CA0e8be165360296a23907BB482c6640D3aC6ad',
  [DEVNET_CHAIN_ID]: '',
}

const REMOVE_FAIL = -1;
const REMOVE_NORMAL = 0;
const REMOVE_SUCCESS = 1;

const SHORT_NAME_DEFAULT = SHORT_NAME_GALILEO;

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

function get3770NameAndAddress(domain) {
  const domains = domain.split(":");
  if (domains.length > 1) {
    return {shortName: domains[0], address: domains[1]};
  } else if(domain.endsWith(".eth")) {
    return {shortName: SHORT_NAME_ETHEREUM, address: domain};
  }
  return {shortName: SHORT_NAME_DEFAULT, address: domain};
}

function getNetWorkIdByShortName(shortName) {
  let chainId = 0;
  switch (shortName) {
    case SHORT_NAME_GALILEO:
      chainId = GALILEO_CHAIN_ID;
      break;
    case SHORT_NAME_ETHEREUM:
      chainId = ETHEREUM_CHAIN_ID;
      break
    case SHORT_NAME_GOERLI:
      chainId = GOERLI_CHAIN_ID;
      break;
    case SHORT_NAME_SEPOLIA:
      chainId = SEPOLIA_CHAIN_ID;
      break;
    case SHORT_NAME_OPTIMISTIC:
      chainId = OPTIMISTIC_CHAIN_ID;
      break;
    case SHORT_NAME_ARBITRUM:
      chainId = ARBITRUM_CHAIN_ID;
      break;
    case SHORT_NAME_OPTIMISTIC_GOERLI:
      chainId = OPTIMISTIC_GOERLI_CHAIN_ID;
      break;
    case SHORT_NAME_ARBITRUM_GOERLI:
      chainId = ARBITRUM_GOERLI_CHAIN_ID;
      break;
    case SHORT_NAME_EVMOS:
      chainId = EVMOS_CHAIN_ID;
      break;
    case SHORT_NAME_ARBITRUM_NOVE:
      chainId = ARBITRUM_NOVE_CHAIN_ID;
      break;
  }
  return chainId;
}

// return address or eip3770 address
async function getWebHandler(domain) {
  // get web handler address, domain is address, xxx.ens, xxx.w3q
  const {shortName, address} = get3770NameAndAddress(domain);
  // address
  const ethAddrReg = /^0x[0-9a-fA-F]{40}$/;
  const chainId = getNetWorkIdByShortName(shortName);
  if (ethAddrReg.test(address)) {
    return {chainId, address};
  }

  // .w3q or .eth domain
  let nameServiceContract = W3NS_ADDRESS[chainId];
  if(!nameServiceContract) {
    console.log(error(`Not Support Name Service: ${domain}`));
    return "";
  }

  let webHandler;
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
  try {
    const nameHash = namehash(address);
    const wnsContract = new ethers.Contract(nameServiceContract, wnsAbi, provider);
    const resolver = await wnsContract.resolver(nameHash);
    const resolverContract = new ethers.Contract(resolver, resolverAbi, provider);
    if (chainId === GALILEO_CHAIN_ID) {
      webHandler = await resolverContract.webHandler(nameHash);
    } else {
      webHandler = await resolverContract.text(nameHash, "web3");
    }
  } catch (e){}
  // address
  if (ethAddrReg.test(webHandler)) {
    return {chainId, webHandler};
  }
  return get3770NameAndAddress(webHandler);
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
  if (chainId === GALILEO_CHAIN_ID || chainId === ETHSTORAGE_CHAIN_ID) {
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
    if (fileSize > 24 * 1024) {
      const chunkSize = Math.ceil(fileSize / (24 * 1024));
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
  if ((chainId === GALILEO_CHAIN_ID || chainId === ETHSTORAGE_CHAIN_ID) && (fileSize > 24 * 1024 - 326)) {
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
    const option = {nonce: getNonce()};
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
      console.log(`Remove file: ${fileName}`);
      return REMOVE_SUCCESS;
    } else {
      return REMOVE_FAIL;
    }
  }
  return REMOVE_NORMAL;
}
// **** utils ****

// **** function ****
const deploy = async (path, domain, key, RPC) => {
  const {chainId, address} = await getWebHandler(domain);
  if (parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(RPC || PROVIDER_URLS[chainId]);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    nonce = await wallet.getTransactionCount("pending");

    let failPool = [];
    let totalCost = 0, totalFileCount = 0, totalFileSize = 0;
    // get file and remove old chunk
    console.log("Stark upload File.......");
    from(recursiveFiles(path, ''))
        .pipe(mergeMap(info => uploadFile(chainId, fileContract, info), 15))
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

const createDirectory = async (key, chainId) => {
  const networkId = chainId ?? GALILEO_CHAIN_ID;
  const factoryAddress = FACTORY_ADDRESS[networkId];
  if(!factoryAddress) {
    console.error(`ERROR: Not support this network!`);
    return;
  }
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[networkId]);
  const wallet = new ethers.Wallet(key, provider);
  const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, wallet);
  const tx = await factoryContract.create();
  console.log(`Transaction: ${tx.hash}`);
  let txReceipt;
  while (!txReceipt) {
    txReceipt = await isTransactionMined(provider, tx.hash);
    await sleep(5000);
  }
  if (txReceipt.status) {
    let iface = new ethers.utils.Interface(factoryAbi);
    let log = iface.parseLog(txReceipt.logs[0]);
    console.log(`FlatDirectory Address: ${log.args[0]}`);
  } else {
    console.error(`ERROR: transaction failed!`);
  }
};

const refund = async (domain, key, RPC) => {
  const {chainId, address} = await getWebHandler(domain);
  if (parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(RPC || PROVIDER_URLS[chainId]);
    const wallet = new ethers.Wallet(key, provider);
    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const tx = await fileContract.refund();
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

const setDefault = async (domain, filename, key, RPC) => {
  const {chainId, address} = await getWebHandler(domain);
  if (parseInt(address) > 0) {
    const provider = new ethers.providers.JsonRpcProvider(RPC || PROVIDER_URLS[chainId]);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    const defaultFile = '0x' + Buffer.from(filename, 'utf8').toString('hex');
    const tx = await fileContract.setDefault(defaultFile);
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
module.exports.setDefault = setDefault;
