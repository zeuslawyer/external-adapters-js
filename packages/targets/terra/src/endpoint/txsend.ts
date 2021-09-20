import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import {
  LCDClient,
  MnemonicKey,
  MsgExecuteContract,
  SyncTxBroadcastResult,
  Wallet,
} from '@terra-money/terra.js'
import { Config, DEFAULT_GAS_PRICES, DEFAULT_GAS_LIMIT } from '../config'

export const NAME = 'txsend'

const customParams = {
  address: ['address'],
  msg: ['msg'],
}

export const signAndBroadcast = async (
  wallet: Wallet,
  client: LCDClient,
  message: MsgExecuteContract,
  gasLimit: string,
  sequenceCounter?: number,
): Promise<SyncTxBroadcastResult> => {
  const tx = await wallet.createAndSignTx({
    msgs: [message],
    gas: gasLimit,
    sequence: sequenceCounter,
  })

  // const result = await client.tx.broadcast(tx) // broadcast waits for block inclusion, but bloats the CL node tasks pipeline
  const result = await client.tx.broadcastSync(tx) // broadcastSync returns faster with only transaction hash, but nonce management isses
  // const result = await client.tx.broadcastAsync(tx) // broadcastAsync returns faster with only transaction hash, without issues

  console.log(`TX sent `)
  console.log(`Message: `)
  console.log(message)

  console.log(`Result: `)
  console.log(result)
  console.log('\n\n')

  return result
}

export const execute: ExecuteWithConfig<Config> = async (request, _, config) => {
  const validator = new Validator(request, customParams)
  if (validator.error) throw validator.error

  const jobRunID = validator.validated.id
  const address = validator.validated.data.address
  const msg = validator.validated.data.msg

  const terra = new LCDClient({
    URL: config.fcdUrl,
    chainID: config.chainId,
    gasPrices: { uluna: config.gasPrices || DEFAULT_GAS_PRICES },
  })

  const wallet = terra.wallet(new MnemonicKey({ mnemonic: config.mnemonic }))

  const execMsg = new MsgExecuteContract(wallet.key.accAddress, address, msg)

  try {
    const result = await signAndBroadcast(
      wallet,
      terra,
      execMsg,
      config.gasLimit || DEFAULT_GAS_LIMIT,
    )

    return Requester.success(
      jobRunID,
      {
        data: { txhash: result.txhash },
        status: 200,
      },
      true,
    )
  } catch (error) {
    console.log(error)
    throw new AdapterError({
      jobRunID,
      message: error.stack,
      statusCode: 400,
    })
  }
}
