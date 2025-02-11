import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const networks = ['mainnet', 'testnet']
const executionEnvs = ['flow', 'evm']

const args = process.argv
const token = args[2]

const endpoints = {
  mainnet:
    'https://raw.githubusercontent.com/Outblock/FRW-web-next/refs/heads/main/pages/api/v3/fts/fts/mainnet',
  testnet:
    'https://raw.githubusercontent.com/Outblock/FRW-web-next/refs/heads/main/pages/api/v3/fts/fts/testnet',
}

const queryTokenList = async (network, executionEnv) => {
  let url = `${endpoints[network]}/${executionEnv}/default.json`

  try {
    // const response = await fetch(url)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'node-fetch',
      },
    })
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    if (data.tokens !== undefined) {
      return data
    } else {
      return undefined
    }
  } catch (e) {
    console.error(`Failed to query token list for ${network}(${executionEnv})`)
    return undefined
  }
}

const writeJSONFile = async (data, network, executionEnv) => {
  const filename = join(process.cwd(), 'jsons', network, executionEnv, [
    'default.json',
  ])

  let originList
  try {
    originList = JSON.parse(fs.readFileSync(filename, 'utf8'))
  } catch (e) {
    console.log(`Failed to read ${filename}`)
  }

  // check diff
  if (
    originList &&
    JSON.stringify(data.tokens) === JSON.stringify(originList.tokens)
  ) {
    console.log(`No change for ${filename}`)
    return
  }

  if (data.tokens.length === 0) {
    console.log('Failed to query token list')
    return
  }

  // update version
  let newTokenAdded = true
  let oldTokenDeleted = false

  if (!!originList) {
    const origTokens = originList.tokens.map((token) => {
      return `${token.address}-${token.contractName}`
    })
    const origTokensSet = new Set(origTokens)
    const newTokens = data.tokens.filter((token) => {
      return `${token.address}-${token.contractName}`
    })
    const newTokensSet = new Set(newTokens)
    newTokenAdded = newTokensSet.size > origTokensSet.size
    oldTokenDeleted = origTokensSet.size > newTokensSet.size
  }

  if (oldTokenDeleted) {
    data.version.major = (originList ?? data).version.major + 1
    data.version.minor = 0
    data.version.patch = 0
  } else if (newTokenAdded) {
    data.version.minor = (originList ?? data).version.minor + 1
    data.version.patch = 0
  } else {
    data.version.patch = (originList ?? data).version.patch + 1
  }

  fs.writeFileSync(filename, JSON.stringify(data, null, 2))
  console.log(`Wrote ${filename}`)
}

async function main() {
  for (const network of networks) {
    for (const executionEnv of executionEnvs) {
      // Step 1. Query Default JSON
      const defaultTokenList = await queryTokenList(network, executionEnv)
      if (!defaultTokenList) {
        console.error(
          `Failed to query default token list for ${network}(${executionEnv})`,
        )
        continue
      } else {
        await writeJSONFile(defaultTokenList, network, executionEnv)
      }
    }
  }
}
main()
