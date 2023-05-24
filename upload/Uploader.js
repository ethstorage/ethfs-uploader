const fs = require('fs');
const os = require('os');
const sha3 = require('js-sha3').keccak_256;
const {ethers} = require("ethers");
const {upload} = require('./4844-utils');

const fileAbi = [
    "function writeChunk(bytes memory name, uint256[] memory chunkIds, uint256[] memory sizes) external payable",
    "function upfrontPayment() external view returns (uint256)",
    "function refund() public",
    "function remove(bytes memory name) external returns (uint256)",
    "function countChunks(bytes memory name) external view returns (uint256)",
    "function getChunkHash(bytes memory name, uint256 chunkId) public view returns (bytes32)"
];

const GALILEO_CHAIN_ID = 3334;

const REMOVE_FAIL = -1;
const REMOVE_NORMAL = 0;
const REMOVE_SUCCESS = 1;

const BLOB_SIZE = 4096 * 31;
const MAX_BLOB_COUNT = 2;

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

const bufferBlob = (buffer) => {
    let i = 0;
    let result = [];
    const len = buffer.length;
    while (i < len) {
        result.push(buffer.slice(i, i += BLOB_SIZE));
    }
    return result;
}

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const getTxReceipt = async (fileContract, transactionHash) => {
    const provider = fileContract.provider;
    let txReceipt;
    while (!txReceipt) {
        const tx = await provider.getTransactionReceipt(transactionHash);
        if (tx && tx.blockNumber) {
            txReceipt = tx;
            break;
        }
        await sleep(5000);
    }

    return txReceipt;
}

const saveFile = (data) => {
    const exp = new Date();
    const path = `${os.tmpdir()}/${exp.getTime()}`;
    fs.writeFileSync(path, data);
    return path;
}

class Uploader {
    #privateKey;
    #providerUrl;
    #chainId;
    #contractAddress;
    #isSupport4844 = false;

    #nonce;
    #fileContract;

    constructor(pk, rpc, chainId, contractAddress, isSupport4844) {
        this.#privateKey = pk;
        this.#providerUrl = rpc;
        this.#chainId = chainId;
        this.#contractAddress = contractAddress;
        this.#isSupport4844 = isSupport4844;
        if (isSupport4844 && pk.startsWith('0x')) {
            this.#privateKey = pk.substring(2, pk.length);
        }
    }

    async init() {
        const provider = new ethers.providers.JsonRpcProvider(this.#providerUrl);
        const wallet = new ethers.Wallet(this.#privateKey, provider);
        this.#nonce = await wallet.getTransactionCount("pending");
        this.#fileContract = new ethers.Contract(this.#contractAddress, fileAbi, wallet);
    }

    getNonce() {
        return this.#nonce++;
    }

    async uploadFile(fileInfo) {
        if (this.#isSupport4844) {
            return await this.upload4844File(fileInfo);
        } else {
            return await this.uploadOldFile(fileInfo);
        }
    };

    async getCost() {
        let cost;
        try {
            cost = await this.#fileContract.upfrontPayment();
        } catch (e) {
            await sleep(3000);
            cost = await this.#fileContract.upfrontPayment();
        }
        return cost;
    }

    async getChunkHash(hexName, chunkId) {
        let hash;
        try {
            hash = await this.#fileContract.getChunkHash(hexName, chunkId);
        } catch (e) {
            await sleep(3000);
            hash = await this.#fileContract.getChunkHash(hexName, chunkId);
        }
        return hash;
    }

    async upload4844File(fileInfo) {
        const {path, name, size} = fileInfo;
        const filePath = path;
        const fileName = name;
        const fileSize = size;

        const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');

        const content = fs.readFileSync(filePath);
        let chunks = [];
        // Data need to be sliced if file > 124K， 1 blob = 4096 * 31 = 124kb
        if (fileSize > BLOB_SIZE) {
            chunks = bufferBlob(content);
        } else {
            chunks.push(content);
        }

        const clearState = await this.clearOldFile(this.#fileContract, fileName, hexName, chunks.length);
        if (clearState === REMOVE_FAIL) {
            return {upload: 0, fileName: fileName};
        }

        const cost = await this.getCost();

        const iFace = new ethers.utils.Interface(fileAbi);
        let uploadCount = 0;
        const failFile = [];
        for (let i = 0, length = chunks.length; i < length; i += MAX_BLOB_COUNT) {
            const maxCount = i + MAX_BLOB_COUNT > length ? i + MAX_BLOB_COUNT - length : MAX_BLOB_COUNT;

            const chunkDatas = [];
            const chunkIds = [];
            const sizes = [];
            if (clearState === REMOVE_NORMAL) {
                // check is change
                for (let j = 0; j < maxCount; j++) {
                    const chunkId = i + j;
                    const localHash = '0x' + sha3(chunks[chunkId]);
                    const hash = await this.getChunkHash(hexName, chunkId);
                    if (localHash === hash) {
                        console.log(`File ${fileName} chunkId: ${chunkId}: The data is not changed.`);
                    } else {
                        chunkDatas.push(chunks[chunkId]);
                        chunkIds.push(chunkId);
                        sizes.push(chunks[chunkId].length);
                    }
                }
                if (chunkIds.length === 0) {
                    // no one
                    continue;
                }
            } else {
                // new chunk
                for (let j = 0; j < maxCount; j++) {
                    const chunkId = i + j;
                    chunkDatas.push(chunks[chunkId]);
                    chunkIds.push(chunkId);
                    sizes.push(chunks[chunkId].length);
                }
            }

            const file = saveFile(Buffer.concat(chunkDatas));
            const value = cost.mul(chunkIds.length);
            let estimatedGas;
            try {
                estimatedGas = await this.#fileContract.estimateGas.writeChunk(hexName, chunkIds, sizes, {
                    value: value
                });
            } catch (e) {
                await sleep(3000);
                estimatedGas = await this.#fileContract.estimateGas.writeChunk(hexName, chunkIds, sizes, {
                    value: value
                });
            }
            const {maxFeePerGas, maxPriorityFeePerGas} = await this.#fileContract.provider.getFeeData();
            const callData = iFace.encodeFunctionData("writeChunk", [hexName, chunkIds, sizes]);

            // upload file
            const option = {
                Nonce: this.getNonce(),
                To: this.#contractAddress,
                Value: value,
                File: file,
                CallData: callData,
                GasLimit: estimatedGas.mul(6).div(5).toString(),
                MaxFeeGas: maxFeePerGas.toString(),
                PriorityGas: maxPriorityFeePerGas.toString(),
                MaxFeeDataPer: 300000000
            };
            const hash = await upload(this.#chainId, this.#providerUrl, this.#privateKey, option);
            console.log(`${fileName}, chunkId: ${chunkIds.toString()}`);
            console.log(`Transaction Id: ${hash}`);

            // get result
            const txReceipt = await getTxReceipt(this.#fileContract, hash);
            if (txReceipt && txReceipt.status) {
                console.log(`File ${fileName} chunkId: ${chunkIds.toString()} uploaded!`);
                uploadCount++;
            } else {
                for (let j = 0; j < chunkIds.length; j++) {
                    failFile.push(chunkIds[i]);
                }
                break;
            }
        }

        return {
            upload: 1,
            fileName: fileName,
            cost: cost,
            fileSize: fileSize / chunks.length / 1024,
            uploadCount: uploadCount,
            failFile: failFile
        };
    }

    async uploadOldFile(fileInfo) {
        const {path, name, size} = fileInfo;
        const filePath = path;
        const fileName = name;
        let fileSize = size;

        const hexName = '0x' + Buffer.from(fileName, 'utf8').toString('hex');
        const content = fs.readFileSync(filePath);
        let chunks = [];
        if (this.#chainId === GALILEO_CHAIN_ID) {
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

        const clearState = await this.clearOldFile(this.#fileContract, fileName, hexName, chunks.length);
        if (clearState === REMOVE_FAIL) {
            return {upload: 0, fileName: fileName};
        }

        let cost = 0;
        if ((this.#chainId === GALILEO_CHAIN_ID) && (fileSize > 24 * 1024 - 326)) {
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
                    hash = await this.#fileContract.getChunkHash(hexName, index);
                } catch (e) {
                    await sleep(3000);
                    hash = await this.#fileContract.getChunkHash(hexName, index);
                }
                if (localHash === hash) {
                    console.log(`File ${fileName} chunkId: ${index}: The data is not changed.`);
                    continue;
                }
            }

            let estimatedGas;
            try {
                estimatedGas = await this.#fileContract.estimateGas.writeChunk(hexName, index, hexData, {
                    value: ethers.utils.parseEther(cost.toString())
                });
            } catch (e) {
                await sleep(3000);
                estimatedGas = await this.#fileContract.estimateGas.writeChunk(hexName, index, hexData, {
                    value: ethers.utils.parseEther(cost.toString())
                });
            }

            // upload file
            const option = {
                nonce: this.getNonce(),
                gasLimit: estimatedGas.mul(6).div(5).toString(),
                value: ethers.utils.parseEther(cost.toString())
            };
            let tx;
            try {
                tx = await this.#fileContract.writeChunk(hexName, index, hexData, option);
            } catch (e) {
                await sleep(5000);
                tx = await this.#fileContract.writeChunk(hexName, index, hexData, option);
            }
            console.log(`${fileName}, chunkId: ${index}`);
            console.log(`Transaction Id: ${tx.hash}`);

            // get result
            const txReceipt = await getTxReceipt(this.#fileContract, tx.hash);
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
    }

    async clearOldFile(fileContract, fileName, hexName, chunkLength) {
        let oldChunkLength;
        try {
            oldChunkLength = await fileContract.countChunks(hexName);
        } catch (e) {
            await sleep(3000);
            oldChunkLength = await fileContract.countChunks(hexName);
        }
        if (oldChunkLength > chunkLength) {
            // remove
            return this.removeFile(fileContract, fileName, hexName);
        } else if (oldChunkLength === 0) {
            return REMOVE_SUCCESS;
        }
        return REMOVE_NORMAL;
    }

    async removeFile(fileContract, fileName, hexName) {
        const estimatedGas = await fileContract.estimateGas.remove(hexName);
        const option = {
            nonce: this.getNonce(),
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
}

module.exports = Uploader
