const Web3 = require('web3');
const JSBI = require('jsbi');
require('dotenv').config();
const ethereumjsutil = require("ethereumjs-util");
const ethers = require('ethers');
const fs = require("fs");
const { breed, getUtxos, getBreedCond, sleep } = require ('./helpers');

const NST_COLOR_BASE = 49153;
const CONFIG = {
  dryRun: JSON.parse(process.env.DRY_RUN) || false, //Tells you what it would do without actually sending any txs
  provider: 'https://testnet-node.leapdao.org',
  dispenser: { 
    priv: process.env.SENDING_PK,
    address: "0x"+ethereumjsutil.privateToAddress(process.env.SENDING_PK).toString('hex') 
  },
  tokenColor: parseInt(process.env.COLOR) || NST_COLOR_BASE, //49155 - USB, 49156 - USA, 49160-65 - PA1-6
  queenUtxoNum: parseInt(process.env.QUEEN_UTXO) || 0,
  //queenId: '0xcbb18d83c09c99d8cfb5f0fad6febfb0d9a41fac9b165399982e43528e7c69db', //USB
  //queenId: '0xa1f5da38474f60e5684a1e511e4668ff4f121c1bf4272cc129155fd2b88171a3',  //USA
  //queenId: '0x3e126cae83cf7524a4764e4ec95c35b1022727e5128afe8747c29883ca12c5cd', //PA1
  //queenId: '0x3cea358b08c0001a4b45c561da6b0b3a7e3d6110898b400b9c4aea921ac9bf90', //PA2
  //queenId: '0x4b76a985c779230d3ebc28ddb825677428816d3aa0c8173056326488130fcafd', //PA3
  //queenId: '0x8b549686f1c520a969ac1aca76231cc96e6d7c1eee43c86b3c6a1e30223019ea', //PA4
  //queenId: '0xa67c2236d8c9b88e8ff06197726eb62304bad3aba1e3dfaf5facd78810f2ef64', //PA5
  queenId: '0x3516e6f1eca6e64e5d99315d9782953b2feeb50e0d1915ae4d10f44c8b03537f', //PA6
  initData: "0x0000000000000000000000000000000000000000000000000000000000000000"
};
const folder = 'wallets-ebt';
const batch = 'pa6';


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
    txHash = await breed(accounts[i], CONFIG.queenId, CONFIG.queenUtxoNum, CONFIG.tokenColor, CONFIG.initData, dispenserWallet, CONFIG.dryRun);
    if (!CONFIG.dryRun) {   
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
      console.log(' Dry run mode enabled! Condition checked but not sent. Result:');
      console.log('  ', txHash);
    }
  }
}

main();