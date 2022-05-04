import { utils } from 'ethers'
import { Logger } from '@chainlink/ea-bootstrap'
import { strictEqual } from 'assert'

type AddressObject = {
  address: string
  network?: string
}

const indexerToNetwork: Record<string, string> = {
  eth_balance: 'ethereum',
  bitcoin_json_rpc: 'bitcoin',
}

export const validateAddresses = (indexer: string, addresses: AddressObject[]): AddressObject[] => {
  const validatedAddresses: AddressObject[] = []
  for (const addressObj of addresses) {
    const { address, network } = addressObj
    let validatedAddress: string | undefined
    const validationNetwork = network || indexerToNetwork[indexer]
    switch (validationNetwork.toLowerCase()) {
      case 'ethereum':
        validatedAddress = getValidEvmAddress(address)
        break
      case 'bitcoin':
        validatedAddress = getValidBtcAddress(address)
        break
      default:
        Logger.debug(
          `There is no address validation procedure defined for the "${network}" network.`,
        )
        validatedAddresses.push(addressObj)
        break
    }
    if (validatedAddress) validatedAddresses.push({ ...addressObj, address: validatedAddress })
  }
  return validatedAddresses
}

/**
 * Returns either a valid Ethereum-style address with a valid checksum
 * or logs a warning and returns undefined
 */
const getValidEvmAddress = (address: string): string | undefined => {
  try {
    return utils.getAddress(address)
  } catch (error) {
    Logger.warn(
      error,
      `The address "${address}" is invalid or has an invalid checksum and has been removed.`,
    )
  }
  return
}

/*
 * Returns a Bitcoin address with a valid format or logs a warning and returns undefined
 */
const getValidBtcAddress = (address: string): string | undefined => {
  const addressPrefix = address[0]
  switch (addressPrefix) {
    // Legacy (P2PKH) and Nested SegWit (P2SH) Bitcoin addresses start with 1 and are case-sensitive
    case '1':
    case '3':
      if (address.length === 34 && isBase58(address)) return address
      Logger.warn(
        { warning: 'Invalid address detected' },
        `The address "${address}" is not a valid Bitcoin address and has been removed.`,
      )
      return
    case 'b':
      if (address.slice(0, 3) === 'bc1' && address.length === 42 && isBech32(address.slice(3)))
        return address
      Logger.warn(
        { warning: 'Invalid address detected' },
        `The address "${address}" is not a valid Bitcoin address and has been removed.`,
      )
      return
    default:
      Logger.warn(
        { warning: 'Invalid address detected' },
        `The address "${address}" is not a valid Bitcoin address and has been removed.`,
      )
      return
  }
}

export const filterDuplicates = (addresses: AddressObject[]): AddressObject[] => {
  const uniqueMap: Record<string, boolean> = {}
  const uniqueAddresses: AddressObject[] = []
  for (const addressObject of addresses) {
    if (uniqueMap[addressObject.address]) {
      Logger.warn(
        { warning: 'Duplicate address detected' },
        `The address "${addressObject.address}" is duplicated in the request and the duplicate has been removed.`,
      )
    } else {
      uniqueMap[addressObject.address] = true
      uniqueAddresses.push(addressObject)
    }
  }
  return uniqueAddresses
}

const isBase58 = (value: string): boolean => /^[A-HJ-NP-Za-km-z1-9]*$/.test(value)

const isBech32 = (value: string): boolean => {
  for (const char of value) {
    if (!isValidChar[char]) return false
  }
  return true
}

const isValidChar: Record<string, boolean> = {
  q: true,
  p: true,
  z: true,
  r: true,
  y: true,
  '9': true,
  x: true,
  '8': true,
  g: true,
  f: true,
  '2': true,
  t: true,
  v: true,
  d: true,
  w: true,
  '0': true,
  s: true,
  '3': true,
  j: true,
  n: true,
  '5': true,
  '4': true,
  k: true,
  h: true,
  c: true,
  e: true,
  '6': true,
  m: true,
  u: true,
  a: true,
  '7': true,
  l: true,
}
