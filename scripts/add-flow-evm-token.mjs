import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import axios from 'axios'
import path from 'path'


const args = process.argv
const tokenAddress = args[2]
const network = args[3]
const identifier = args[4]

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const fixesEndpoints = {
  mainnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/mainnet",
  testnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/testnet"
};


const queryTokenList = async (network) => {
  try {
    const url = `${fixesEndpoints[network]}/evm/default.json`
    const response = await axios.get(url);
    const data = await response.data;
    const { tokens } = data
    if (
      Array.isArray(tokens) &&
      tokens.length > 0
    ) {
      return tokens
    } else {
      return []
    }
  } catch (e) {
    console.log(e)
    console.error(`Failed to query default token list for ${network}`);
    return [];
  }
};

const loadOutblocTokenList = async (filePath) => {
  try {
    const resolvedPath = path.resolve(__dirname, filePath)
    // 读取文件内容
    const content = fs.readFileSync(resolvedPath, 'utf8')

    return JSON.parse(content)

  } catch (e) {
    console.error(`Failed to load JSON from ${filePath}`);
    return [];
  }
};

const main = async () => {

  const tokenList = await queryTokenList(network)

  const tokenMaps = {}

  tokenList.map((token) => {
    const { address } = token
    tokenMaps[`${address}`] = token
  })

  const tokenIden = `${tokenAddress}`

  let tokenInfo = {}
  if (tokenMaps[tokenIden] !== undefined) {
    tokenInfo = tokenMaps[tokenIden]
  } else {
    throw ("Token not found")
  }

  const currentTokens = await loadOutblocTokenList(`../jsons/${network}/evm/default.json`)

  const { tokens: outblockTokens } = currentTokens


  outblockTokens.map((outblockToken) => {

    const { address } = outblockToken

    if (`${address}` === tokenIden) {
      throw ('Token already exist')
    }
  })

  const newToken = {
    "chainId": tokenInfo.chainId,
    "address": tokenInfo.address,
    "symbol": tokenInfo.symbol,
    "name": tokenInfo.name,
    "decimals": tokenInfo.decimals,
    "logoURI": tokenInfo.logoURI,
    "flowIdentifier": tokenInfo.flowIdentifier || identifier,
    "tags": tokenInfo.tags,
    "extensions": tokenInfo.extensions
  }

  currentTokens.tokens.push(newToken)
  currentTokens.totalAmount = Number(currentTokens.totalAmount) + 1

  fs.writeFileSync(path.resolve(__dirname, `../jsons/${network}/evm/default.json`), JSON.stringify(currentTokens, null, 2))

  console.log(`token with address ${tokenAddress} add success`)
}


main();