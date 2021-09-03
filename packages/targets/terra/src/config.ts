import { util, Requester } from '@chainlink/ea-bootstrap'
import { Config as DefaultConfig } from '@chainlink/types'

export const NAME = 'terra'

export const DEFAULT_ENDPOINT = 'txsend'
export const DEFAULT_GAS_PRICES = 0.15

export type Config = DefaultConfig & {
  fcdUrl: string
  chainId: string
  mnemonic: string
  gasPrices?: string
}

export const makeConfig = (prefix?: string): Config => {
  const defaultConfig = Requester.getDefaultConfig(prefix)
  return {
    ...defaultConfig,
    fcdUrl: util.getRequiredEnv('FCD_URL', prefix),
    chainId: util.getRequiredEnv('CHAIN_ID', prefix),
    mnemonic: util.getRequiredEnv('MNEMONIC', prefix),
    gasPrices: util.getEnv('GAS_PRICES', prefix),
  }
}
