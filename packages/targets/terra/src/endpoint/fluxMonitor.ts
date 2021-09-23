import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import { LCDClient, MnemonicKey, MsgExecuteContract, isTxError } from '@terra-money/terra.js'
import {
  Config,
  DEFAULT_GAS_PRICES,
  DEFAULT_GAS_LIMIT,
  DEFAULT_DECIMALS,
  DEFAULT_RETRIES,
} from '../config'
// import { ConfigResponse } from '../models/configResponse'
import { SubmitMsg } from '../models/submitMsg'
import { signAndBroadcast } from './txsend'

export const NAME = 'fluxmonitor'

const customParams = {
  address: ['address'],
  roundId: ['round_id'],
  result: ['result'],
}

let sequenceCounter: number | undefined
let retries: number

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

  // const aggregatorConfig = await terra.wasm.contractQuery<ConfigResponse>(address, {
  //   get_aggregator_config: {},
  // })

  const submission = decimalResult
    .toFixed(Number(config.decimals || DEFAULT_DECIMALS))
    .replace('.', '')

  const wallet = terra.wallet(new MnemonicKey({ mnemonic: config.mnemonic }))

  const submitMsg: SubmitMsg = {
    submit: {
      round_id: roundId,
      submission,
    },
  }
  const execMsg = new MsgExecuteContract(wallet.key.accAddress, address, submitMsg)

  try {
    retries = 0
    let result
    do {
      if (sequenceCounter == null) {
        const account = await terra.auth.accountInfo(wallet.key.accAddress)
        sequenceCounter = account.sequence
      } else {
        // we need not increment in case we retry with the same nonce
        if (retries == 0) {
          sequenceCounter++
        }
      }

      console.log('Sequence(nonce): ')
      console.log(sequenceCounter)

      result = await signAndBroadcast(
        wallet,
        terra,
        execMsg,
        config.gasLimit || DEFAULT_GAS_LIMIT,
        sequenceCounter,
      )

      retries++
      if (result.raw_log?.includes('sequence')) {
        // if its account sequence mismatch error, then retrying with the same nonce is recommended, else resync
        if (!result.raw_log.startsWith('account sequence mismatch')) {
          sequenceCounter = undefined
        }
        console.log('Sequence(nonce) error, retry #', retries)
      } else {
        break
      }
    } while (retries <= Number(config.retries || DEFAULT_RETRIES))

    if (isTxError(result)) {
      sequenceCounter = undefined
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
