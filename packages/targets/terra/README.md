# Chainlink External Adapter for Terra

This adapter interacts with Chainlink contracts on Terra.

### Environment Variables

| Required? |    Name    |              Description               | Options | Defaults to |
| :-------: | :--------: | :------------------------------------: | :-----: | :---------: |
|    ✅     |  FCD_URL   | URL to FCD endpoint of the Terra chain |         |             |
|    ✅     |  CHAIN_ID  |             Terra chain ID             |         |             |
|    ✅     |  MNEMONIC  |      Mnemonic key used to send tx      |         |             |
|           | GAS_PRICES |         Set target gas prices          |         |   100000    |

---

### Input Parameters

| Required? |   Name   |     Description     |          Options          | Defaults to |
| :-------: | :------: | :-----------------: | :-----------------------: | :---------: |
|           | endpoint | The endpoint to use | [txsend](#Terra-Endpoint) |   txsend    |

---

## Input Params

| Required? |   Name    |               Description                | Options | Defaults to |
| :-------: | :-------: | :--------------------------------------: | :-----: | :---------: |
|    ✅     | `address` | Address of the contract to interact with |         |             |
|    ✅     |   `msg`   |               Execute msg                |         |             |

## Sample Input

```json
{
  "id": "278c97ffadb54a5bbb93cfec5f7b5503",
  "data": {
    "address": "terra1tjlvjxdg55z5dvq5jv8nnuwrsjpwfdlydumhtt",
    "msg": {
      "update_available_funds": {}
    }
  }
}
```

### Sample Output

```json
{
  "jobRunID": "278c97ffadb54a5bbb93cfec5f7b5503",
  "statusCode": 200,
  "data": {
    "txhash": "2F3C9E232B7384E4AFFAA1A17C9F4C633DA94C4BC62EC44D250B0579DC120362"
  }
}
```
