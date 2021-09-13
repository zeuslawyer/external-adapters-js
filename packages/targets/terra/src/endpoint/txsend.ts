import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import {
  LCDClient,
  MnemonicKey,
  MsgExecuteContract,
  isTxError,
  BlockTxBroadcastResult,
  SyncTxBroadcastResult,
  Wallet,
} from '@terra-money/terra.js'
import { Config, DEFAULT_GAS_PRICES } from '../config'

export const NAME = 'txsend'

const customParams = {
  address: ['address'],
  msg: ['msg'],
}

export const signAndBroadcast = async (
  wallet: Wallet,
  client: LCDClient,
  message: MsgExecuteContract,
): Promise<BlockTxBroadcastResult | SyncTxBroadcastResult> => {
  const tx = await wallet.createAndSignTx({
    msgs: [message],
    gas: '300000',
  })

  const result = await client.tx.broadcast(tx) // braodcast waits for block inclusion
  // const result = await client.tx.broadcastSync(tx) // braodcastSync returns faster with only transaction hash
  console.log('Sent TX. Result: ')

  console.log(result)
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
    const result = await signAndBroadcast(wallet, terra, execMsg)

    if (isTxError(result)) {
      throw new Error(result.raw_log)
    }

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
