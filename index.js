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

const SHORT_NAME_MAINNET = "w3q";
const SHORT_NAME_GALILEO = "w3q-g";
const SHORT_NAME_ETHEREUM = "eth";
const SHORT_NAME_RINKEBY = "rin";

const MAINNET_NETWORK = "mainnet";
const GALILEO_NETWORK = "galileo";
const DEVNET_NETWORK = "devnet";

const MAINNET_CHAIN_ID = 333;
const GALILEO_CHAIN_ID = 3334;
const ETHEREUM_CHAIN_ID = 1;
const RINKEBY_CHAIN_ID = 4;
const DEVNET_CHAIN_ID = 1337;

const PROVIDER_URLS = {
  [MAINNET_CHAIN_ID]: '',
  [GALILEO_CHAIN_ID]: 'https://galileo.web3q.io:8545',
  [DEVNET_CHAIN_ID]: 'http://localhost:8545',
}
const W3NS_ADDRESS = {
  [MAINNET_CHAIN_ID]: '',
  [GALILEO_CHAIN_ID]: '0xD379B91ac6a93AF106802EB076d16A54E3519CED',
  [ETHEREUM_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [RINKEBY_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [DEVNET_CHAIN_ID]: '',
}
const FACTORY_ADDRESS = {
  [MAINNET_CHAIN_ID]: '',
  [GALILEO_CHAIN_ID]: '0x1CA0e8be165360296a23907BB482c6640D3aC6ad',
  [DEVNET_CHAIN_ID]: '',
}

const REMOVE_FAIL = -1;
const REMOVE_NORMAL = 0;
const REMOVE_SUCCESS = 1;

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
  if (domain && domain.indexOf(":") !== -1) {
    const result = domain.split(":");
    return {shortName: result[0], address: result[1]};
  }
  return {address: domain};
}

function getNetWorkIdByShortName(shortName) {
  let chainId = GALILEO_CHAIN_ID;
  switch (shortName) {
    case SHORT_NAME_MAINNET:
      chainId = MAINNET_CHAIN_ID;
      break
    case SHORT_NAME_GALILEO:
      chainId = GALILEO_CHAIN_ID;
      break;
    case SHORT_NAME_ETHEREUM:
      chainId = ETHEREUM_CHAIN_ID;
      break
    case SHORT_NAME_RINKEBY:
      chainId = RINKEBY_CHAIN_ID;
      break;
  }
  return chainId;
}

function getNetWorkIdByDomain(domain) {
  let chainId = GALILEO_CHAIN_ID;
  if (domain.endsWith(".eth")) {
    return ETHEREUM_CHAIN_ID;
  } else if (domain.endsWith(".w3q")) {
    chainId = GALILEO_CHAIN_ID;
  }
  return chainId;
}

function getNetWorkId(network, shortName) {
  let chainId = GALILEO_CHAIN_ID;
  if (shortName) {
    chainId = getNetWorkIdByShortName(shortName);
  }
  if (network) {
    switch (network) {
      case MAINNET_NETWORK:
        chainId = MAINNET_CHAIN_ID;
        break
      case GALILEO_NETWORK:
        chainId = GALILEO_CHAIN_ID;
        break;
      case DEVNET_NETWORK:
        chainId = DEVNET_CHAIN_ID;
        break;
    }
  }
  return chainId;
}

// return address or eip3770 address
async function getWebHandler(domain, RPC) {
  // get web handler address, domain is address, xxx.ens, xxx.w3q
  const {shortName, address} = get3770NameAndAddress(domain);

  // address
  const ethAddrReg = /^0x[0-9a-fA-F]{40}$/;
  if (ethAddrReg.test(address)) {
    if (shortName === SHORT_NAME_RINKEBY
        || shortName === SHORT_NAME_ETHEREUM) {
      return address;
    }
    return domain;
  }

  // .w3q or .eth domain
  const chainId = shortName ? getNetWorkIdByShortName(shortName) : getNetWorkIdByDomain(address);
  if(!RPC && !PROVIDER_URLS[chainId]) {
    console.log(error(`RPC ERROR: ${RPC}`));
    return "";
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC || PROVIDER_URLS[chainId]);
  let webHandler;
  try {
    const nameHash = namehash(address);
    const wnsContract = new ethers.Contract(W3NS_ADDRESS[chainId], wnsAbi, provider);
    const resolver = await wnsContract.resolver(nameHash);
    const resolverContract = new ethers.Contract(resolver, resolverAbi, provider);
    if (chainId === ETHEREUM_CHAIN_ID || chainId === RINKEBY_CHAIN_ID) {
      webHandler = await resolverContract.text(nameHash, "web3");
    } else {
      webHandler = await resolverContract.webHandler(nameHash);
    }
  } catch (e){}
  return webHandler;
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

const uploadFile = async (fileContract, fileInfo) => {
  const {path, name, size} = fileInfo;
  const filePath = path;
  const fileName = name;
  let fileSize = size;

  const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');
  const content = fs.readFileSync(filePath);
  // Data need to be sliced if file > 475K
  let chunks = [];
  if (fileSize > 475 * 1024) {
    const chunkSize = Math.ceil(fileSize / (475 * 1024));
    chunks = bufferChunk(content, chunkSize);
    fileSize = fileSize / chunkSize;
  } else {
    chunks.push(content);
  }

  const clearState = await clearOldFile(fileContract, fileName, hexName, chunks.length);
  if (clearState === REMOVE_FAIL) {
    return {upload: 0, fileName: fileName};
  }

  let cost = 0;
  if (fileSize > 24 * 1024 - 326) {
    cost = Math.floor((fileSize + 326) / 1024 / 24);
  }

  let uploadCount = 0;
  const failFile = [];
  for (const index in chunks) {
    const chunk = chunks[index];
    const hexData = '0x' + chunk.toString('hex');

    if (clearState === REMOVE_NORMAL) {
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
      try {
        estimatedGas = await fileContract.estimateGas.writeChunk(hexName, index, hexData, {
          value: ethers.utils.parseEther(cost.toString())
        });
      } catch (e) {
        // transaction is error
        failFile.push(index);
        continue;
      }
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
    } catch (e) {
      await sleep(3000);
      txReceipt = await getTxReceipt(fileContract, tx.hash);
    }
    if (txReceipt.status) {
      console.log(`File ${fileName} chunkId: ${index} uploaded!`);
      uploadCount++;
    } else {
      failFile.push(index);
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
const deploy = async (path, domain, key, RPC, network) => {
  const pointer = await getWebHandler(domain, RPC);
  const {shortName, address} = get3770NameAndAddress(pointer);
  if (parseInt(address) > 0) {
    const chainId = getNetWorkId(network, shortName);
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
    const wallet = new ethers.Wallet(key, provider);

    const fileContract = new ethers.Contract(address, fileAbi, wallet);
    nonce = await wallet.getTransactionCount("pending");

    let failPool = [];
    let totalCost = 0, totalFileCount = 0, totalFileSize = 0;
    // get file and remove old chunk
    console.log("Stark upload File.......");
    from(recursiveFiles(path, ''))
        .pipe(mergeMap(info => uploadFile(fileContract, info), 15))
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

const createDirectory = async (key, network) => {
  const chainId = getNetWorkId(network);
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
  const wallet = new ethers.Wallet(key, provider);
  const factoryContract = new ethers.Contract(FACTORY_ADDRESS[chainId], factoryAbi, wallet);
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

const refund = async (domain, key, RPC, network) => {
  const pointer = await getWebHandler(domain, RPC);
  const {shortName, address} = get3770NameAndAddress(pointer);
  if (parseInt(address) > 0) {
    const chainId = getNetWorkId(network, shortName);
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
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

const setDefault = async (domain, filename, key, RPC, network) => {
  const pointer = await getWebHandler(domain, RPC);
  const {shortName, address} = get3770NameAndAddress(pointer);
  if (parseInt(address) > 0) {
    const chainId = getNetWorkId(network, shortName);
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URLS[chainId]);
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
