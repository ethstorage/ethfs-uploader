const fs = require('fs');
const { EthStorage, DownloadFile } = require("ethstorage-sdk");
const { ethers } = require("ethers");
const { normalize } = require('eth-ens-namehash');
const sha3 = require('js-sha3').keccak_256;
const { from, mergeMap } = require('rxjs');
const {Uploader, VERSION_BLOB} = require("./upload/Uploader");

const color = require('colors-cli/safe')
const os = require("os");
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
const SHORT_NAME_DEVNET = 'devnet';
const SHORT_NAME_ETH_STORAGE = "es";

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
const DEVNET_CHAIN_ID = 7011893062;
const ETH_STORAGE_CHAIN_ID = 3333;

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
  [SHORT_NAME_DEVNET]: DEVNET_CHAIN_ID,
  [SHORT_NAME_ETH_STORAGE]: ETH_STORAGE_CHAIN_ID
}

const PROVIDER_URLS = {
  [GALILEO_CHAIN_ID]: 'https://galileo.web3q.io:8545',
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
  [DEVNET_CHAIN_ID]: 'http://65.109.115.36:8545',
  [ETH_STORAGE_CHAIN_ID]: 'http://88.99.30.186:9545',
}

const NS_ADDRESS = {
  [GALILEO_CHAIN_ID]: '0xD379B91ac6a93AF106802EB076d16A54E3519CED',
  [ETHEREUM_CHAIN_ID]: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
  [GOERLI_CHAIN_ID]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
}

// eip-4844
const ETH_STORAGE_ADDRESS = {
  [DEVNET_CHAIN_ID]: '0xb4B46bdAA835F8E4b4d8e208B6559cD267851051',
}

const SHORT_NAME_DEFAULT = SHORT_NAME_GALILEO;
const CHAIN_ID_DEFAULT = NETWORK_MAPING[SHORT_NAME_DEFAULT];


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
  console.log(domain, domains)
  if (domains.length > 1) {
    return {shortName: domains[0], address: domains[1]};
  } else if(domain.endsWith(".eth")) {
    return {shortName: SHORT_NAME_ETHEREUM, address: domain};
  }
  return {shortName: SHORT_NAME_DEFAULT, address: domain};
}

function getNetWorkIdByShortName(shortName) {
  let chainId = NETWORK_MAPING[shortName];
  if (chainId) {
    return chainId;
  }
  return 0;
}

// return address or eip3770 address
async function getWebHandler(domain, RPC) {
  // get web handler address, domain is address, xxx.ens, xxx.w3q
  const {shortName, address} = get3770NameAndAddress(domain);
  const chainId = getNetWorkIdByShortName(shortName);
  let providerUrl = RPC ?? PROVIDER_URLS[chainId];
  if (!providerUrl) {
    console.error(error(`ERROR: The network need RPC, please try again after setting RPC!`));
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
  const provider = new ethers.JsonRpcProvider(providerUrl);
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
  } catch (e){}
  // address
  if (ethAddrReg.test(webHandler)) {
    return {providerUrl, chainId, address: webHandler};
  }
  const shortAdd = get3770NameAndAddress(webHandler);
  const newChainId = getNetWorkIdByShortName(shortAdd.shortName);
  providerUrl = chainId === newChainId ? providerUrl : PROVIDER_URLS[newChainId];
  return {
    providerUrl: providerUrl,
    chainId: newChainId,
    address: shortAdd.address
  };
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
const remove = async (key, domain, fileName, rpc) => {
  if (!ethers.isHexString(key)) {
    console.error(error(`ERROR: Invalid private key!`));
    return;
  }
  if (!domain) {
    console.error(error(`ERROR: Invalid address!`));
    return;
  }
  if (!fileName) {
    console.error(error(`ERROR: Invalid file name!`));
    return;
  }

  const {providerUrl, address} = await getWebHandler(domain, rpc);
  if (providerUrl && parseInt(address) > 0) {
    console.log(`Removing file ${fileName}`);
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(key, provider);
    let prevInfo;
    await checkBalance(provider, address, wallet.address).then(info => {
      prevInfo = info;
    })

    const ethStorage = new EthStorage(providerUrl, key, address);
    await ethStorage.remove(fileName);

    await checkBalance(provider, address, wallet.address).then(info => {
      console.log(`domainBalance: ${info.domainBalance}, accountBalance: ${info.accountBalance}, 
        balanceChange: ${prevInfo.accountBalance - info.accountBalance}`);
    })
  }
}

const deploy = async (key, domain, path, rpc, type = VERSION_BLOB) => {
  if (!ethers.isHexString(key)) {
    console.error(error(`ERROR: Invalid private key!`));
    return;
  }
  if (!domain) {
    console.error(error(`ERROR: Invalid address!`));
    return;
  }

  const {providerUrl, chainId, address} = await getWebHandler(domain, rpc);
  if (providerUrl && parseInt(address) > 0) {
    let syncPoolSize = 15;
    if (chainId === ARBITRUM_NOVE_CHAIN_ID) {
      syncPoolSize = 4;
    } else if(chainId === DEVNET_CHAIN_ID) {
      syncPoolSize = 2;
    }

    const uploader  = new Uploader(key, providerUrl, chainId, address, type);
    const check = await uploader.init();
    if (!check) {
      console.log(`ERROR: The current network does not support this upload type, please switch to another type.  Type=${type}`);
      return;
    }

    let failPool = [];
    let totalCost = 0, totalFileCount = 0, totalFileSize = 0;
    // get file and remove old chunk
    console.log("Start upload File.......");
    from(recursiveFiles(path, ''))
        .pipe(mergeMap(info => uploader.uploadFile(info), syncPoolSize))
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

const createDirectory = async (key, chainId = CHAIN_ID_DEFAULT, rpc) => {
  const providerUrl = rpc ?? PROVIDER_URLS[chainId];
  if (!providerUrl) {
    console.error(error(`ERROR: The network need RPC, please try again after setting RPC!`));
    return;
  }
  if (!ethers.isHexString(key)) {
    console.error(error(`ERROR: Invalid private key!`));
    return;
  }

  console.log("providerUrl=", providerUrl);
  console.log("chainId=", chainId);
  const ETH_CONTRACT_ADDR = ETH_STORAGE_ADDRESS[chainId];
  const ethStorage = new EthStorage(providerUrl, key);
  await ethStorage.deployDirectory(ETH_CONTRACT_ADDR);
};

const refund = async (key, domain, rpc) => {
  if (!ethers.isHexString(key)) {
    console.error(error(`ERROR: Invalid private key!`));
    return;
  }
  if (!domain) {
    console.error(error(`ERROR: Invalid address!`));
    return;
  }

  const {providerUrl, address} = await getWebHandler(domain, rpc);
  if (providerUrl && parseInt(address) > 0) {
    const ethStorage = new EthStorage(providerUrl, key, address);
    await ethStorage.refund();
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const setDefault = async (key, domain, filename, rpc) => {
  if (!ethers.isHexString(key)) {
    console.error(error(`ERROR: Invalid private key!`));
    return;
  }
  if (!domain) {
    console.error(error(`ERROR: Invalid address!`));
    return;
  }

  const {providerUrl, address} = await getWebHandler(domain, rpc);
  if (providerUrl && parseInt(address) > 0) {
    const ethStorage = new EthStorage(providerUrl, key, address);
    await ethStorage.setDefaultFile(filename);
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
};

const download = async (domain, fileName, rpc) => {
  if (!domain) {
    console.error(error(`ERROR: Invalid address!`));
    return;
  }
  if (!fileName) {
    console.error(error(`ERROR: Invalid file name!`));
    return;
  }

  let {providerUrl, chainId, address} = await getWebHandler(domain, rpc);
  if (providerUrl && parseInt(address) > 0) {
    // replace rpc to eth storage
    if (chainId === DEVNET_CHAIN_ID) {
      providerUrl = PROVIDER_URLS[ETH_STORAGE_CHAIN_ID];
    }
    const buf = await DownloadFile(providerUrl, address, fileName);
    if (buf.length > 0) {
      const dir = `${__dirname}/download/`;
      const savePath = `${dir}/${fileName}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFileSync(savePath, buf);
      console.log(`Success: file path is ${savePath}`);
    } else {
      console.log(error(`ERROR: The download of ${fileName} failed or the file does not exist.`));
    }
  } else {
    console.log(error(`ERROR: ${domain} domain doesn't exist`));
  }
}
// **** function ****

module.exports.deploy = deploy;
module.exports.create = createDirectory;
module.exports.refund = refund;
module.exports.remove = remove;
module.exports.setDefault = setDefault;
module.exports.download = download;
