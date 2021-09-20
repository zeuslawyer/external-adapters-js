import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import { LCDClient, MnemonicKey, MsgExecuteContract, isTxError } from '@terra-money/terra.js'
import { Config, DEFAULT_GAS_PRICES, DEFAULT_GAS_LIMIT } from '../config'
import { ConfigResponse } from '../models/configResponse'
import { SubmitMsg } from '../models/submitMsg'
import { signAndBroadcast } from './txsend'

export const NAME = 'fluxmonitor'

const customParams = {
  address: ['address'],
  roundId: ['round_id'],
  result: ['result'],
}

let sequenceCounter: number

export const execute: ExecuteWithConfig<Config> = async (request, _, config) => {
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
    if (sequenceCounter == null) {
      const account = await terra.auth.accountInfo(wallet.key.accAddress)
      sequenceCounter = account.sequence
    } else {
      sequenceCounter++
    }

    console.log('Current sequence number: ')
    console.log(sequenceCounter)

    const result = await signAndBroadcast(
      wallet,
      terra,
      execMsg,
      config.gasLimit || DEFAULT_GAS_LIMIT,
      sequenceCounter,
    )

    if (isTxError(result)) {
      // resync just in case sequence counter is wrong, e.g a manual tx is sent from the same account
      const account = await terra.auth.accountInfo(wallet.key.accAddress)
      sequenceCounter = account.sequence
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
