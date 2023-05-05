const childProcess = require('child_process');

const execWithPromise = async command => {
    return new Promise(async (resolve, reject) => {
        childProcess.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(err);
                process.exit(1);
            }
            resolve(stderr)
        });
    });
};

export const upload = async (chainId, rpc, privateKey, tx) => {
    const ChainId = chainId;
    const RPC = rpc;
    const PrivateKey = privateKey;

    const {Nonce, To, Value, Data, CallData, GasLimit, PriorityGas, MaxFeePer} = tx;
    // calldata
    // nonce
    // value
    const cmd = `./blob-utils tx --chain-id ${ChainId} --rpc-url ${RPC} --blob-file ${Data} -to ${To} --private-key ${PrivateKey} --gas-limit ${GasLimit} --max-fee-per-data-gas ${MaxFeePer} --priority-gas-price ${PriorityGas}`;
    const result = await execWithPromise(cmd);
    console.log(result);
}
