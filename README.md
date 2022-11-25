# EthFS Uploader

## Installation
```
npm install ethfs-uploader
```
<br/>

## Usage
### Support EIP-3770 Address
```
ethereum
    eth:<domain/address>

... 

galileo
    w3q-g:<domain/address>       
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
ens
    npx ethfs-uploader <directory/file> <domain> --privateKey <private-key> --RPC <rpc-url>

w3ns
    npx ethfs-uploader <directory/file> <domain/address> --privateKey <private-key>
```
##### Example
```
ens
    npx ethfs-uploader dist eth:ens.eth --privateKey 0x32... --PRC https://rpc.xxx

w3ns
    npx ethfs-uploader index.html 0x1825...2388 --privateKey 0x32...
```
<br/>


### Set FlatDirectory Default Entrance
```
ens
    npx ethfs-uploader --default --address <domain> --file <fileName> --privateKey <private-key> --RPC <rpc-url>

w3ns
    npx ethfs-uploader --default --address <domain/address> --file <fileName> --privateKey <private-key>
```
##### Example
```
ens
    npx ethfs-uploader --default --address eth:home.eth --file index.html --privateKey 0x32... --RPC https://rpc.xxx

w3ns
    npx ethfs-uploader --default --address w3q-g:home.w3q --file index.html --privateKey 0x32...
```
<br/>

### Repo
[Github Repo](https://github.com/QuarkChain/ethfs-uploader)
