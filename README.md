# paperwallet
Paper wallets to seed the [LeapDAO instances of Burner Wallet](https://github.com/leapdao/burner-wallet) with private keys.


![paperwallets](https://user-images.githubusercontent.com/659301/57143331-eda8fe80-6dbe-11e9-8218-5b0223f31bd6.jpg)

# install
```javascript
git clone https://github.com/leapdao/paper-wallet
cd paper-wallet
yarn
```

# run
```javascript
node index.js
```

This will generate a file called `generated.html` that can be printed.

You could also just print out `private.svg` if you are in a pinch.

If you would like me to generate you a special wallet design `cspaperwallet.jpg` hit me up on Twitter or Telegram @austingriffith

![walletsinfold](https://user-images.githubusercontent.com/2653167/51705218-3ab75080-1fd8-11e9-9495-66458938d9f9.jpg)


# batch generation

If you want to make a large batch of wallets and merge them into a single pdf for ease of printing, there is a `batch.js`:

First, get your `template.html` looking right.

Then, edit `HOWMANY` in the `batch-austin.js` (original version from Austin Griffin) and run it:
```
node batch-austin.js
```
Also possible to generate without template (update background picture and sizes/positions of QR codes inside the script):
```
node batch.js
```

This will generate a file called `wallets.pdf` and also `addresses.txt` for airdropping.

![image](https://user-images.githubusercontent.com/2653167/55583840-18306a80-56e0-11e9-80ef-16d177b415fa.png)

Finally... print, fold, cut, and glue your way to freedom!

![paperwalletprinted](https://user-images.githubusercontent.com/2653167/55584775-48790880-56e2-11e9-93b6-4034c2b0ff5d.jpg)

# sticker generation

It is possible to generate just QR code stickers instead of using templates. `batch-stickers-tmpl.js` will generate them using template (`templatestickers*.html`) to place the stickers on page while `batch-stickers-gen.js` uses parameters configured inside the script to generate a page. 

Configure `URL`, `HOWMANY`, `PATH` and `BATCH`. Additionaly `perPage` is configured in `batch-stickers-tmpl.js` or `positions` in `batch-stickers-gen.js`

```
node batch-stickers.js
```
or

```
node batch-stickers-cannes.js
```


# air dropping

`airdrop.js` - For droping ERC20
`airdrop_nft.js` - For breeding NFTs using breeding conditions and distributing them

You will need a distribution account. I would suggest using a mnemonic you can remember in the Burner Wallet and then copy the private key the wallet generates. 

You will then pass this private key into the airdrop script within the command you run it with or in a `.env` file:

```
echo "SENDING_PK=0xdeadbeef" > .env
```

Options to configure:
`provider` - link to Leap network RPC
`tokenColor` - Color of dispensed token in Leap network
`amountToSend` - How many tokens to send to each address
`folder` - sub-folder with file of addresses
`batch` - name of the batch (as used in batch generation script)

If this account has the necessary funds, it will drop whatever you specify to all `accounts` listed in your `addresses-${batch}.txt` file:
```
node airdrop.js
```

Use the CONFIG options like `dryRun` for more control and testing.

![walletcutting](https://user-images.githubusercontent.com/2653167/51705234-4440b880-1fd8-11e9-93ed-93338376cfdc.jpg)



