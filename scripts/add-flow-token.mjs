import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import axios from 'axios'
import path from 'path'


const args = process.argv
const tokenAddress = args[2]
const tokenName = args[3]
const network = args[4]
const evmAddress = args[5] || ''

// console.log(tokenAddress, tokenName, network)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const networks = ["mainnet", "testnet"];

const fixesEndpoints = {
  mainnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/mainnet",
  testnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/testnet"
};

// const outblockEndpoints = {
//   mainnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/mainnet",
//   testnet: "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/testnet"
// };

const queryTokenList = async (network, isFixed) => {
  try {
    const url = `${fixesEndpoints[network]}/flow/default.json`
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
    const { address, contractName } = token
    tokenMaps[`${address}.${contractName}`] = token
  })

  const tokenIden = `${tokenAddress}.${tokenName}`

  let tokenInfo = {}
  if (tokenMaps[tokenIden] !== undefined) {
    tokenInfo = tokenMaps[tokenIden]
  } else {
    throw ("Token not found")
  }

  if (evmAddress.length > 0) {
    tokenInfo.evmAddress = evmAddress
    tokenInfo.evm_address = evmAddress
  }
  const currentTokens = await loadOutblocTokenList(`../jsons/${network}/flow/default.json`)

  const { tokens: outblockTokens } = currentTokens


  outblockTokens.map((outblockToken) => {

    const { address, contractName } = outblockToken

    if (`${address}.${contractName}` === tokenIden) {
      throw ('Token already exist')
    }
  })

  currentTokens.tokens.push(tokenInfo)
  currentTokens.totalAmount = Number(currentTokens.totalAmount) + 1

  fs.writeFileSync(path.resolve(__dirname, `../jsons/${network}/flow/default.json`), JSON.stringify(currentTokens, null, 2))

  console.log(`token ${tokenName} with address ${tokenAddress} add success`)
}


main();