import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import {
  LCDClient,
  MnemonicKey,
  MsgExecuteContract,
  isTxError,
  BlockTxBroadcastResult,
  Wallet,
} from '@terra-money/terra.js'
import { Config, DEFAULT_GAS_PRICES } from '../config'
import { ConfigResponse } from '../models/configResponse'
import { SubmitMsg } from '../models/submitMsg'

export const NAME = 'fluxmonitor'

const customParams = {
  address: ['address'],
  roundId: ['round_id'],
  result: ['result'],
}

const signAndBroadcast = async (
  wallet: Wallet,
  client: LCDClient,
  message: MsgExecuteContract,
): Promise<BlockTxBroadcastResult> => {
  const tx = await wallet.createAndSignTx({
    msgs: [message],
    gas: '300000',
  })

  const result = await client.tx.broadcast(tx)
  return result
}

export const execute: ExecuteWithConfig<Config> = async (request, config) => {
  const validator = new Validator(request, customParams)
  if (validator.error) throw validator.error

  const jobRunID = validator.validated.id
  const address = validator.validated.data.address
  const roundId = validator.validated.data.roundId
  const decimalResult = Number.parseFloat(validator.validated.data.result)

  const terra = new LCDClient({
    URL: config.fcdUrl,
    chainID: config.chainId,
    gasPrices: { uluna: config.gasPrices || DEFAULT_GAS_PRICES },
  })

  const aggregatorConfig = await terra.wasm.contractQuery<ConfigResponse>(address, {
    get_aggregator_config: {},
  })

  const submission = decimalResult.toFixed(aggregatorConfig.decimals).replace('.', '')

  const wallet = terra.wallet(new MnemonicKey({ mnemonic: config.mnemonic }))

  const submitMsg: SubmitMsg = {
    submit: {
      round_id: roundId,
      submission,
    },
  }
  const execMsg = new MsgExecuteContract(wallet.key.accAddress, address, submitMsg)

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
