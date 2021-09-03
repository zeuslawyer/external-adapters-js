import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig } from '@chainlink/types'
import { LCDClient, MnemonicKey, MsgExecuteContract, isTxError } from '@terra-money/terra.js'
import { Config, DEFAULT_GAS_PRICES } from '../config'

export const NAME = 'txsend'

const customParams = {
  address: ['address'],
  msg: ['msg'],
}

export const execute: ExecuteWithConfig<Config> = async (request, config) => {
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
    const tx = await wallet.createAndSignTx({
      msgs: [execMsg],
      gas: '300000',
    })
    const result = await terra.tx.broadcast(tx)

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
      message: error.toString(),
      statusCode: 400,
    })
  }
}
