import { Requester } from '@chainlink/ea-bootstrap'
import { assertError, assertSuccess } from '@chainlink/ea-test-helpers'
import { AdapterRequest } from '@chainlink/types'
import { makeExecute } from '../../src/adapter'

describe('execute', () => {
  const jobID = '1'
  const contractAddress = 'terra1tjlvjxdg55z5dvq5jv8nnuwrsjpwfdlydumhtt'
  const exampleMsg = {
    update_available_funds: {},
  }
  const execute = makeExecute()

  describe('successful calls @integration', () => {
    const requests = [
      {
        name: 'id not supplied',
        testData: {
          data: {
            address: contractAddress,
            msg: exampleMsg,
          },
        },
      },
      {
        name: 'msg',
        testData: {
          id: jobID,
          data: {
            address: contractAddress,
            msg: exampleMsg,
          },
        },
      },
    ]

    requests.forEach((req) => {
      it(`${req.name}`, async () => {
        jest.setTimeout(6000) // necessary when using real chain

        const data = await execute(req.testData as AdapterRequest)
        assertSuccess({ expected: 200, actual: data.statusCode }, data, jobID)
        expect(data.data.txhash).toBeTruthy()
      })
    })
  })

  describe('error calls @integration', () => {
    const requests = [
      {
        name: 'unknown base',
        testData: {
          id: jobID,
          data: {
            address: 'not_real',
            msg: exampleMsg,
          },
        },
      },
      {
        name: 'unknown quote',
        testData: {
          id: jobID,
          data: { address: contractAddress, msg: 'not_real' },
        },
      },
    ]

    requests.forEach((req) => {
      it(`${req.name}`, async () => {
        try {
          await execute(req.testData as AdapterRequest)
        } catch (error) {
          const errorResp = Requester.errored(jobID, error)
          assertError({ expected: 400, actual: errorResp.statusCode }, errorResp, jobID)
        }
      })
    })
  })
})
