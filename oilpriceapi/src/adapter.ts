import { Config, ExecuteFactory, ExecuteWithConfig } from '@chainlink/types'
import { Requester, Validator } from '@chainlink/external-adapter'

const commonKeys: Record<string, string> = {
  bz: 'BRENT_CRUDE_USD',
  brent: 'BRENT_CRUDE_USD',
}

const customParams = {
  base: ['type', 'base', 'asset', 'from', 'market'],
  endpoint: false,
}

const customError = (data: Record<string, unknown>) => {
  return data.data === null
}

export const execute: ExecuteWithConfig = async (input, config) => {
  const validator = new Validator(input, customParams)
  if (validator.error) throw validator.error

  const jobRunID = validator.validated.id
  const endpoint = validator.validated.data.endpoint || 'prices/latest'
  const url = `https://api.oilpriceapi.com/v1/${endpoint}`
  // eslint-disable-next-line camelcase
  let by_code = validator.validated.data.base.toLowerCase()
  if (commonKeys[by_code]) {
    // eslint-disable-next-line camelcase
    by_code = commonKeys[by_code]
  }

  const params = {
    by_code,
  }

  const headers = {
    Authorization: `Token ${config.apiKey}`,
  }

  const reqConfig = {
    ...config.api,
    params,
    url,
    headers,
  }

  const response = await Requester.request(reqConfig, customError)
  response.data.result = Requester.validateResultNumber(response.data, ['data', 'price'])
  return Requester.success(jobRunID, response)
}

export const makeConfig = (prefix?: string): Config => Requester.getDefaultConfig(prefix)

export const makeExecute: ExecuteFactory<Config> = (config) => {
  return async (request) => execute(request, config || makeConfig())
}
