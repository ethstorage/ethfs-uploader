# Web3Q Deployer

## Installation
```
npm install ethfs-uploader
```
<br/>

## Usage
### Support EIP-3770 Address
```
mainnet 
    w3q:<domain/address>

galileo
    w3q-g:<domain/address>

ethereum
    eth:<domain/address>

rinkeby
    rin:<domain/address>
```
##### Example
```
mainnet
    w3q:home.w3q

galileo
    w3q-g:0x1825...2388

ethereum
    eth:ens.eth

rinkeby
    rin:ens.eth
```
<br/>



### Create FlatDirectory Command
```
npx ethfs-uploader --create --privateKey <private-key>

// output: contract address 
```
##### Example
```
npx ethfs-uploader --create --privateKey 0x32...
```
<br/>



### Deploy Command
```
w3ns
    npx ethfs-uploader <directory/file> <domain/address> --privateKey <private-key>

ens
    npx ethfs-uploader <directory/file> <domain> --privateKey <private-key> --RPC <rpc-url>
```
##### Example
```
w3ns
    npx ethfs-uploader dist w3q-g:home.w3q --privateKey 0x32...

    npx ethfs-uploader index.html 0x1825...2388 --privateKey 0x32...

ens
    npx ethfs-uploader dist eth:ens.eth --privateKey 0x32... --PRC https://rpc.xxx

    npx ethfs-uploader dist rin:testens.eth --privateKey 0x32... --PRC https://rpc.xxx
```
<br/>


### Set FlatDirectory Default Entrance
```
w3ns
    npx ethfs-uploader --default --address <domain/address> --file <fileName> --privateKey <private-key>

ens
    npx ethfs-uploader --default --address <domain> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
```
##### Example
```
w3ns
    npx ethfs-uploader --default --address w3q-g:home.w3q --file index.html --privateKey 0x32...

ens
    npx ethfs-uploader --default --address eth:home.eth --file index.html --privateKey 0x32... --RPC https://rpc.xxx
```
<br/>

### Repo
[Github Repo](https://github.com/QuarkChain/ethfs-uploader)
