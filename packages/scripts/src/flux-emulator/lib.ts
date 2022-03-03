import chalk from 'chalk'
import * as ephemeralAdapters from '../ephemeral-adapters/lib'
import {
  addAdapterToConfig,
  convertConfigToK6Payload,
  fetchConfigFromUrl,
  K6Payload,
  ReferenceContractConfig,
  removeAdapterFromFeed,
  setFluxConfig,
} from './ReferenceContractConfig'
const { red, blue } = chalk

const logInfo = (msg: string) => console.log(blue.bold(msg))

const throwError = (msg: string): never => {
  //TODO address w/ typescript
  process.exitCode = 1
  throw red.bold(msg)
}

import * as fs from 'fs'

export const ACTIONS: string[] = ['start', 'stop', 'k6payload']
export const WEIWATCHER_SERVER = 'https://weiwatchers.com/flux-emulator-mainnet.json'
export const CONFIG_SERVER = 'https://adapters.qa.stage.cldev.sh/fluxconfig'
export const FLUX_CONFIG_INPUTS: ephemeralAdapters.Inputs = {
  action: 'start',
  adapter: 'dummy-external',
  release: 'fluxconfig',
  imageTag: 'latest',
  imageRepository: 'kalverra/',
  helmValuesOverride: './packages/scripts/src/flux-emulator/values.yaml',
  name: 'fluxconfig',
}

export interface Inputs {
  action: string
  adapter: string
  release: string
  ephemeralName: string
  weiWatcherServer: string
  configServerGet: string
  configServerSet: string
}

const usageString = `
3 arguments are required
1: Options are "start", "stop" or "k6payload". In releation to whether you want to start, stop the testing the adapter, or build a k6 payload from a flux emulator config.
2: The adapter name you wish to tell flux emulator to test.
3. The unique release tag for this adapter`

/**
 * Check the input arguments and return an Inputs object if all are valid
 * @returns {Inputs} The Inputs object built from the cli and env
 */
export const checkArgs = (): Inputs => {
  if (process.argv.length < 4) throwError(usageString)

  const action: string = process.argv[2]
  if (!ACTIONS.includes(action))
    throwError(`The first argument must be one of: ${ACTIONS.join(', ')}\n ${usageString}`)

  const adapter: string = process.argv[3]
  if (!adapter) throwError(`Missing second argument: adapter\n ${usageString}`)

  const release: string = process.argv[4]
  if (!release) throwError(`Missing third argument: release tag\n ${usageString}`)

  const weiWatcherServer: string = process.env['WEIWATCHER_SERVER'] ?? WEIWATCHER_SERVER
  const configServer: string = process.env['CONFIG_SERVER'] ?? CONFIG_SERVER
  const configServerGet = configServer + '/json_variable'
  const configServerSet = configServer + '/set_json_variable'

  const ephemeralName = ephemeralAdapters.generateName({
    action: '',
    adapter,
    release,
    name: '',
  })

  return {
    action,
    adapter,
    release,
    ephemeralName,
    weiWatcherServer,
    configServerGet,
    configServerSet,
  }
}

/**
 * Starts the flux emulator test
 * @param {Inputs} inputs The inputs to use to determine which adapter to test
 */
export const start = async (inputs: Inputs): Promise<void> => {
  logInfo('Fetching master config')
  const masterConfig = await fetchConfigFromUrl(inputs.weiWatcherServer)
  if (!masterConfig || !masterConfig.configs) throwError('Could not get the master configuration')

  logInfo('Fetching existing qa config')
  const qaConfig = await fetchConfigFromUrl(inputs.configServerGet)
  if (!qaConfig || !qaConfig.configs) throwError('Could not get the qa configuration')

  logInfo('Adding new adapter to qa config')
  const newConfig = addAdapterToConfig(
    inputs.adapter,
    inputs.ephemeralName,
    masterConfig.configs,
    qaConfig.configs,
  )

  logInfo('Sending new config to config server')
  await setFluxConfig(newConfig, inputs.configServerSet)
}

/**
 * Stops the flux emulator test
 * @param {Inputs} inputs The inputs to use to determine which adapter to test
 */
export const stop = async (inputs: Inputs): Promise<void> => {
  const qaConfig = fetchConfigFromUrl(inputs.configServerGet)
  if (!qaConfig || !qaConfig.configs) throwError('Could not get the qa configuration')

  const newConfig = removeAdapterFromFeed(inputs.ephemeralName, qaConfig.configs)
  await setFluxConfig(newConfig, inputs.configServerSet)
}

/**
 * Writes a json file for k6 to use as a payload based. Pulls the config from
 * weiwatchers to determine which adapter can hit which services and with which
 * pairs.
 * @param {Inputs} inputs The inputs to use to determine which adapter to create the config for
 */
export const writeK6Payload = async (inputs: Inputs): Promise<void> => {
  logInfo('Fetching master config')
  const masterConfig = await fetchConfigFromUrl(inputs.weiWatcherServer).toPromise()
  if (!masterConfig || !masterConfig.configs) throwError('Could not get the master configuration')

  logInfo('Adding new adapter to qa config')
  const qaConfig = { configs: [] }
  const newConfig: ReferenceContractConfig[] = addAdapterToConfig(
    inputs.adapter,
    inputs.ephemeralName,
    //@ts-expect-error masterConfig.configs guaranteed to be defined given throwError when undefined
    masterConfig.configs as ReferenceContractConfig[],
    qaConfig.configs,
  )

  // const nameAndData: { name: string; data: Record<string, any> }[] = newConfig.map(
  //   ({ name, data }) => ({ name, data })
  // )
  // TODO add integration test data here

  // TODO add test-payload data here

  // TODO if nameAndData is empty at this point, throw error

  logInfo('Convert config into k6 payload')
  const payloads: K6Payload[] = convertConfigToK6Payload(newConfig)

  logInfo('Writing k6 payload to a file')
  // write the payloads to a file in the k6 folder for the docker container to pick up
  fs.writeFileSync('./packages/k6/src/config/ws.json', JSON.stringify(payloads))
}

export const main = async (): Promise<void> => {
  logInfo('Checking the arguments')
  const inputs: Inputs = checkArgs()

  logInfo(`The configuration for this run is:\n ${JSON.stringify(inputs, null, 2)}`)

  switch (inputs.action) {
    case 'start': {
      logInfo('Adding configuation')
      await start(inputs)
      break
    }
    case 'stop': {
      logInfo('Removing configuation')
      await stop(inputs)
      break
    }
    case 'k6payload': {
      logInfo('Creating k6 payload')
      await writeK6Payload(inputs)
      break
    }
    default: {
      throwError(`The first argument must be one of: ${ACTIONS.join(', ')}\n ${usageString}`)
      break
    }
  }
}
