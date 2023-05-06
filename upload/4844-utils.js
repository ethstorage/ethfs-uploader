const childProcess = require('child_process');

const execWithPromise = async command => {
    return new Promise(async (resolve, reject) => {
        childProcess.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            const index = stderr.indexOf('hash=');
            const hash = stderr.substring(index + 5, stderr.length - 1);
            resolve(hash);
        });
    });
};

const upload = async (chainId, rpc, privateKey, tx) => {
    const ChainId = chainId;
    const RPC = rpc;
    const PrivateKey = privateKey;

    const {Nonce, To, Value, File, CallData, GasLimit, MaxFeeGas, PriorityGas, MaxFeeDataPer} = tx;
    const cmd = `./upload/blob-utils tx --chain-id ${ChainId} --rpc-url ${RPC} --private-key ${PrivateKey} --blob-file ${File} --nonce ${Nonce} -to ${To} --value ${Value} --calldata ${CallData} --gas-limit ${GasLimit} --gas-price ${MaxFeeGas} --priority-gas-price ${PriorityGas} --max-fee-per-data-gas ${MaxFeeDataPer}`;
    return await execWithPromise(cmd);
}

module.exports = { upload }
