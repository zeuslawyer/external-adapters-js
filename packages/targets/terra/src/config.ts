import { util, Requester } from '@chainlink/ea-bootstrap'
import types from '@chainlink/types'

export const DEFAULT_ENDPOINT = 'txsend'
export const DEFAULT_GAS_PRICES = 0.15
export const DEFAULT_GAS_LIMIT = '300000'

export type Config = types.Config & {
  fcdUrl: string
  chainId: string
  mnemonic: string
  gasPrices?: string
  gasLimit?: string
}

export const makeConfig = (prefix?: string): Config => {
  const defaultConfig = Requester.getDefaultConfig(prefix)
  return {
    ...defaultConfig,
    fcdUrl: util.getRequiredEnv('FCD_URL', prefix),
    chainId: util.getRequiredEnv('CHAIN_ID', prefix),
    mnemonic: util.getRequiredEnv('MNEMONIC', prefix),
    gasPrices: util.getEnv('GAS_PRICES', prefix),
    gasLimit: util.getEnv('GAS_LIMIT', prefix),
  }
}
