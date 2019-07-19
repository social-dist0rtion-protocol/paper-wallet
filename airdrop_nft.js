const Web3 = require('web3');
const JSBI = require('jsbi');
require('dotenv').config();
const ethereumjsutil = require("ethereumjs-util");
const ethers = require('ethers');
const fs = require("fs");
const { breed, getUtxos, getBreedCond, sleep } = require ('./helpers');

const NST_COLOR_BASE = 49153;
const CONFIG = {
  dryRun: false, //Tells you what it would do without actually sending any txs
  provider: 'https://testnet-node.leapdao.org',
  dispenser: { 
    priv: process.env.SENDING_PK,
    address: "0x"+ethereumjsutil.privateToAddress(process.env.SENDING_PK).toString('hex') 
  },
  tokenColor: parseInt(process.env.COLOR) || NST_COLOR_BASE,
  queenUtxoNum: 1,
  queenId: '0xcbb18d83c09c99d8cfb5f0fad6febfb0d9a41fac9b165399982e43528e7c69db',
  initData: "0x0000000000000000000000000000000000000000000000000000000000000000"
};
const folder = 'wallets';
const batch = '0';


//use this to debug CONFIG
//console.log(CONFIG)
//process.exit(1)

const dispenserWallet = new ethers.Wallet(
  CONFIG.dispenser.priv, 
  new ethers.providers.JsonRpcProvider(CONFIG.provider),
);

async function main() {
  if(CONFIG.tokenColor < NST_COLOR_BASE) throw new Error(`Token color should be >= ${NST_COLOR_BASE}`);
    
  let accounts = fs.readFileSync(`./${folder}/addresses-${batch}.txt`).toString().trim().split("\n");
  const breedCond = (await getBreedCond(CONFIG.tokenColor, dispenserWallet.provider)).condAddr;
  const condUtxos = await getUtxos(breedCond, CONFIG.tokenColor, dispenserWallet.provider);
  let utxos;
  let txHash;
  let txReceipt;

  console.log(accounts.length, 'NFTs will be bred and distributed');
  console.log('Dispenser address:', CONFIG.dispenser.address);
  console.log('Breeding condition address', breedCond);
  console.log('Breeding condition UTXOs:', condUtxos);
  if (CONFIG.dryRun) console.log('Dry run mode is enabled! No tokens will be dispensed!');
  if(condUtxos.length == 0) {
    if(!CONFIG.dryRun) {
      throw new Error('Breeding condition does not have a queen!');
    } else {
      console.log('Breeding condition does not have a queen!');
    }
  }

  
  for(let i = 0; i < accounts.length; i++) {
    console.log(i, 'Breeding and sending NFT to', accounts[i]);
    utxos = await getUtxos(accounts[i], CONFIG.tokenColor, dispenserWallet.provider);
    if (utxos.length > 0) {
      console.log('   Address already has tokens(', utxos.length, '). Skipping.');
      continue;
    }
    if (!CONFIG.dryRun) {
      txHash = await breed(accounts[i], CONFIG.queenId, CONFIG.queenUtxoNum, CONFIG.tokenColor, CONFIG.initData, dispenserWallet);
      for(let i = 0; i <= 5; i++) {
        await sleep(1000);
        txReceipt = await dispenserWallet.provider.send("eth_getTransactionReceipt", [txHash]);   
        if(txReceipt) break;
      }   
      utxos = await getUtxos(accounts[i], CONFIG.tokenColor, dispenserWallet.provider);
      if (utxos.length == 1) {
        console.log('   Done');
      } else {
        console.log('   Failed! Expected 1 token, actual: ', utxos.length);
      }
    } else {
      console.log(' Dry run mode enabled! Will not send NFTs');
    }
  }
}

main();