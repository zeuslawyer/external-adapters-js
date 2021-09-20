import { Requester, Validator, AdapterError } from '@chainlink/ea-bootstrap'
import { ExecuteWithConfig, ExecuteFactory } from '@chainlink/types'
import { makeConfig, DEFAULT_ENDPOINT, Config } from './config'
import { fluxMonitor, txsend } from './endpoint'
import { Mutex } from 'async-mutex'

const inputParams = {
  endpoint: false,
}

const mutex = new Mutex()

export const execute: ExecuteWithConfig<Config> = async (request, context, config) => {
  const validator = new Validator(request, inputParams)
  if (validator.error) throw validator.error

  Requester.logConfig(config)
  const jobRunID = validator.validated.id
  const endpoint = validator.validated.data.endpoint || DEFAULT_ENDPOINT
  console.log('Incoming request: ')
  console.table(request)

  switch (endpoint.toLowerCase()) {
    case txsend.NAME: {
      return await txsend.execute(request, context, config)
    }
    case fluxMonitor.NAME: {
      return await fluxMonitor.execute(request, context, config)
    }
    default: {
      throw new AdapterError({
        jobRunID,
        message: `Endpoint ${endpoint} not supported.`,
        statusCode: 400,
      })
    }
  }
}

export const makeExecute: ExecuteFactory<Config> = (config) => {
  return async (request, context) =>
    await mutex.runExclusive(async () => execute(request, context, config || makeConfig()))
}
