# EthFS Uploader

## Installation
```
npm install ethfs-uploader
```
<br/>

## Supported networks
| Chain Name                 | Chain Short Name and Chain Id |
|----------------------------|-------------------------------|
| Ethereum Mainnet           | eth / 1                       | 
| Goerli Testnet             | gor / 5                       | 
| Sepolia Testnet            | sep / 11155111                | 
| Optimism                   | oeth / 10                     | 
| Optimism Testnet           | ogor / 420                    | 
| Arbitrum One               | arb1 / 42161                  | 
| Arbitrum Nova              | arb-nova / 42170              | 
| Arbitrum Testnet           | arb-goerli / 421613           | 
| Web3Q Galileo Testnet      | w3q-g / 3334                  | 
| BNB Smart Chain            | bnb / 56                      | 
| BNB Smart Chain Testnet    | bnbt / 97                     | 
| Avalanche C-Chain          | avax / 43114                  | 
| Avalanche Fuji Testnet     | fuji / 43113                  | 
| Fantom Opera               | ftm / 250                     | 
| Fantom Testnet             | tftm / 4002                   | 
| Polygon Mainnet            | matic / 137                   | 
| Polygon Mumbai             | maticmum / 80001              | 
| Polygon zkEVM Testnet      | zkevmtest / 1402              | 
| QuarkChain Mainnet Shard 0 | qkc-s0 / 100001               |
| QuarkChain Devnet Shard 0  | qkc-d-s0 / 110001             |
| Harmony Mainnet Shard 0    | hmy-s0 / 1666600000           |
| Harmony Testnet Shard 0    | hmy-b-s0 / 1666700000         |
| Evmos                      | evmos / 9001                  | 
| Evmos Testnet              | evmos-testnet / 9000          |
 

## Usage
### Support EIP-3770 Address
```
ethereum
    eth:<name|address>

... 

galileo
    w3q-g:<name|address>       
```
##### Example
```
ethereum
    eth:ens.eth

...

galileo
    w3q-g:0x1825...2388
```
<br/>



### Create FlatDirectory Command
Galileo is the default network if it's not specified, otherwise, you should use "--chainId" to set it. RPC should also be specified if the network is Ethereum mainnet or an unlisted network.
```
npx ethfs-uploader --create --privateKey <private-key>
npx ethfs-uploader --create --privateKey <private-key> --chainId <chainId>
npx ethfs-uploader --create --privateKey <private-key> --chainId <chainId> --RPC <rpc>

// output: contract address 
```
##### Example
```
npx ethfs-uploader --create --privateKey 0x32...
npx ethfs-uploader --create --privateKey 0x32... --chainId 5
npx ethfs-uploader --create --privateKey 0x32... --chainId 1 --RPC https://rpc.ankr.com/eth
```
<br/>



### Deploy Command
If you want to use name instead of FlatDirectory address, the name should be pointed to the FlatDirectory address in advance. Click [here](https://docs.web3url.io/advanced-topics/bind-ens-name-to-a-chain-specific-address) for details.
```
FlatDirectory address
    npx ethfs-uploader <directory|file> <address> --privateKey <private-key>
    npx ethfs-uploader <directory|file> <address> --privateKey <private-key> --RPC <rpc-url>
ens
    npx ethfs-uploader <directory|file> <name> --privateKey <private-key> --RPC <rpc-url>
w3ns
    npx ethfs-uploader <directory|file> <name> --privateKey <private-key>
```
##### Example
```
FlatDirectory address
    npx ethfs-uploader index.html gor:0x1825...2388 --privateKey 0x32...
    npx ethfs-uploader index.html xxx:0x1825...2388 --privateKey 0x32... --RPC https://rpc.xxx
ens
    npx ethfs-uploader dist eth:ens.eth --privateKey 0x32... --PRC https://rpc.ankr.com/eth
w3ns
    npx ethfs-uploader dist w3q-g:home.w3q --privateKey 0x32...
```
<br/>


### Set FlatDirectory Default Entrance
```
FlatDirectory address
    npx ethfs-uploader --default --address <address> --file <fileName> --privateKey <private-key>
    npx ethfs-uploader --default --address <address> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
ens
    npx ethfs-uploader --default --address <name> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
w3ns
    npx ethfs-uploader --default --address <name> --file <fileName> --privateKey <private-key>
```
##### Example
```
FlatDirectory address
    npx ethfs-uploader --default --address gor:0x1825...2388 --file index.html --privateKey 0x32...
    npx ethfs-uploader --default --address xxx:0x1825...2388 --file index.html --privateKey 0x32... --RPC https://rpc.xxx
ens
    npx ethfs-uploader --default --address eth:ens.eth --file index.html --privateKey 0x32... --RPC https://rpc.ankr.com/eth
w3ns
    npx ethfs-uploader --default --address w3q-g:home.w3q --file index.html --privateKey 0x32...
```
<br/>



### Remove File
```
FlatDirectory address
    npx ethfs-uploader --remove --address <address> --file <fileName> --privateKey <private-key>
    npx ethfs-uploader --remove --address <address> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
ens
    npx ethfs-uploader --remove --address <name> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
w3ns
    npx ethfs-uploader --remove --address <name> --file <fileName> --privateKey <private-key>
```
##### Example
```
FlatDirectory address
    npx ethfs-uploader --remove --address gor:0x1825...2388 --file index.html --privateKey 0x32...
    npx ethfs-uploader --remove --address xxx:0x1825...2388 --file index.html --privateKey 0x32... --RPC https://rpc.xxx
ens
    npx ethfs-uploader --remove --address eth:ens.eth --file src/home.vue --privateKey 0x32... --RPC https://rpc.ankr.com/eth
w3ns
    npx ethfs-uploader --remove --address w3q-g:home.w3q --file src/home.vue --privateKey 0x32...
```
<br/>

### Repo
[Github Repo](https://github.com/QuarkChain/ethfs-uploader)
