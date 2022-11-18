# Web3Q Deployer

## Installation
```
npm install w3q-deployer
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
npx w3q-deploy --create --privateKey <private-key>

// output: contract address 
```
##### Example
```
npx w3q-deploy --create --privateKey 0x32...
```
<br/>



### Deploy Command
```
w3ns
    npx w3q-deploy <directory/file> <domain/address> --privateKey <private-key>

ens
    npx w3q-deploy <directory/file> <domain> --privateKey <private-key> --RPC <rpc-url>
```
##### Example
```
w3ns
    npx w3q-deploy dist w3q-g:home.w3q --privateKey 0x32...

    npx w3q-deploy index.html 0x1825...2388 --privateKey 0x32...

ens
    npx w3q-deploy dist eth:ens.eth --privateKey 0x32... --PRC https://rpc.xxx

    npx w3q-deploy dist rin:testens.eth --privateKey 0x32... --PRC https://rpc.xxx
```
<br/>


### Set FlatDirectory Default Entrance
```
w3ns
    npx w3q-deploy --default --address <domain/address> --file <fileName> --privateKey <private-key>

ens
    npx w3q-deploy --default --address <domain> --file <fileName> --privateKey <private-key> --RPC <rpc-url>
```
##### Example
```
w3ns
    npx w3q-deploy --default --address w3q-g:home.w3q --file index.html --privateKey 0x32...

ens
    npx w3q-deploy --default --address eth:home.eth --file index.html --privateKey 0x32... --RPC https://rpc.xxx
```
<br/>

### Repo
[Github Repo](https://github.com/QuarkChain/w3q-deployer)
