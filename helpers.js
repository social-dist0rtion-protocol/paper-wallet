const JSBI = require('jsbi');
const { Tx, helpers, Output, Outpoint } = require('leap-core');
const Web3 = require('web3');
const qr = require('qr-image');
const base64url = require('base64url');

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve,ms);
    })
}

async function getBalance(address, color, rpc) {
    const response = await rpc.send('plasma_unspent', [address]);
    const balance = response.reduce((sum, unspent) => { 
        return (unspent.output.color === color) ? JSBI.add(sum, JSBI.BigInt(unspent.output.value)) : sum}, JSBI.BigInt(0));

    return balance;
}

async function sendFunds(from, to, amount, color, rpc) {
    const utxos = (await rpc.send("plasma_unspent", [from.address]))
    .map(u => ({
      output: u.output,
      outpoint: Outpoint.fromRaw(u.outpoint),
    }));

    if (utxos.length === 0) {
        throw new Error("No tokens left in the source wallet");
    }

    const inputs = helpers.calcInputs(utxos, from.address, amount, color);

    let outputs = helpers.calcOutputs(utxos, inputs, from.address, to, amount, color);

    const tx = Tx.transfer(inputs, outputs).signAll(from.priv);

    // eslint-disable-next-line no-console
    const txHash = await rpc.send("eth_sendRawTransaction", [tx.hex()]);
    console.log('txHash:', txHash);

    return txHash;
}

function generateWallet(url, path = './wallets', batchName = '0') {
    const COMPRESS = true
    const AUTOPRINT = false
    const MINEFOR = false//"feeddeadbeef"
    const DISPLAYPK = false;
    const web3 = new Web3(url);
    const workDir = process.cwd();

    let result = "";
    if(MINEFOR){
    while(!result.address || result.address.toLowerCase().indexOf("0x"+MINEFOR)!==0){
        result = web3.eth.accounts.create();
        //console.log(result.address)
    }
    } else {
        result = web3.eth.accounts.create();
    }

    let PK = result.privateKey
    if(DISPLAYPK) console.log(PK);
    let pkLink
    if(COMPRESS) {
        function pkToUrl(pk) {
            return base64url(web3.utils.hexToBytes(pk));
        }
        let encoded = pkToUrl(PK);
        pkLink = url+"/pk#"+encoded;
    } else {
        pkLink = url+"/pk#"+PK.replace("0x","");
    }
    //console.log(pkLink)
    var private = qr.image(pkLink, { type: 'png', margin: 1 });
    var publicAddress = result.address;
    private.pipe(require('fs').createWriteStream(`${path}/${publicAddress.substring(0,8)}-priv.png`));


    var public = qr.image(url+"/"+publicAddress, { type: 'svg' });
    public.pipe(require('fs').createWriteStream(`${path}/${publicAddress.substring(0,8)}.svg`));
    //console.log("public.svg"+URL+"/"+publicAddress)

    console.log(publicAddress);

    var fs = require('fs');

    fs.appendFile(`${path}/addresses-${batchName}.txt`,publicAddress+"\n", function (err) {
        if (err) throw err;
    });

    return publicAddress;
}

function generateStickers(addresses, walletsDir, fileName = 'generated', perPage=15, cb) {
    if (addresses.length > perPage) {
        throw new Error(`Max ${perPage} stickers will fit on page`);
    }

    let fs = require('fs');
    let data;
    try {
        data = fs.readFileSync(`templatestickers${perPage}.html`, 'utf8');
    } catch(e) {
        console.log('Error:', e.stack);
    }
    

    let result = data.replace(/\*\*PATH\*\*/g, walletsDir);
    for (let i = 0; i < addresses.length; i++) {
        result = result
            .replace(new RegExp(`\\*\\*PUBLIC${i + 1}\\*\\*`, 'g'), addresses[i].substring(0,8)+"......"+addresses[i].substring(addresses[i].length-7))
            .replace(new RegExp(`\\*\\*PRIV${i + 1}\\*\\*`, 'g'), addresses[i].substring(0,8)+"-priv");
    }
    //console.log(result);
    //comment unused divs:
    if (addresses.length < perPage) {
        result = result.replace(new RegExp(`\\*\\*${addresses.length + 1}\\*\\*-->`, 'g'), addresses.length + 1);
        for(let i = addresses.length + 2; i <= perPage; i++){
            result = result.replace(new RegExp(`<!--\\*\\*${i}\\*\\*-->`, 'g'), i);
        }
        result = result.replace(new RegExp('<!---->', 'g'), '-->');
    }

    try {
        fs.writeFileSync("generated.html", result, 'utf8');    
    }  catch(e) {
        console.log('Error:', e.stack);
    }
    let html = fs.readFileSync('./generated.html', 'utf8');
    let conversion = require("phantom-html-to-pdf")();
    console.log("Generating PDF...")
    conversion({
        html: html,
        allowLocalFilesAccess: true,
        phantomPath: require("phantomjs-prebuilt").path,
        settings: {
                javascriptEnabled : true,
                resourceTimeout: 10000
            },
            paperSize: {
                format: 'A4',
                orientation: 'portrait',
                margin: {
                    top: "0in",
                    left: "0in",
                    right:"0in"
                },
            },
    }, function(err, pdf) {
        if (err) return console.log(err);
        let output = fs.createWriteStream(`${walletsDir}/${fileName}.pdf`);
        //console.log(pdf.logs);
        //console.log(pdf.numberOfPages);
        // since pdf.stream is a node.js stream you can use it
        // to save the pdf to a file (like in this example) or to
        // respond an http request.
        pdf.stream.pipe(output);
        conversion.kill();
        cb();
    });
}

function generateStickersHTML(addresses, walletsDir, fileName, pos, cb) {
    const perPage = pos.x.length * pos.y.length;
    const elementWidth = Math.round(100 / pos.y.length);
    
    if (addresses.length > perPage) {
        throw new Error(`Max ${perPage} stickers will fit on page`);
    }

    const divStciker = (address, suffix, posX, posY, isAddr = false) => {
        let sizes = isAddr ? pos.sizes.addr : pos.sizes.priv;

        return `
        <div style="position:absolute;left:${posX};top:${posY};background-color:#FFFFFF;width:${elementWidth}%;height:${sizes.height}px;" >
            <div style="position:realtive;text-align:center;font-family:sans-serif;font-weight:bolder;margin-top:5px;font-size:${sizes.font}px;color:#000000" >
                ${address.substring(0,8)+"......"+address.substring(address.length-7)}
            </div>
            <img src="file://${walletsDir}/${address.substring(0,8)+suffix}"
                style="display:block;margin-left:auto;margin-right:auto;width:${sizes.width}px;height:${sizes.height}px"
            />
        </div>`;
    }

    const formHtml = (html) => {
        return `<html>
        <head>
            <link href="https://fonts.googleapis.com/css?family=Limelight" rel="stylesheet">
        </head>
        <body style="font-family: 'Limelight', cursive;">
        ` +
        html + `
        </body></html>`;
    }

    let html_priv = '';
    let html_pub = '';
    let n = 0;

    for(let i = 0; i < pos.y.length; i++) {
        for(let j = 0; j < pos.x.length; j++) {
            html_priv = html_priv + divStciker(addresses[n], '-priv.png', pos.x[j], pos.y[i], false);
            html_pub = html_pub + divStciker(addresses[n], '.svg', pos.x[j], pos.y[i], true);
            n++;
            if (n == addresses.length) break;
        }
        if (n == addresses.length) break;
    }

    html_priv = formHtml(html_priv);
    html_pub = formHtml(html_pub);

    /*console.log('------------priv-------------');
    console.log(html_priv);
    console.log('------------pub--------------');
    console.log(html_pub);
    console.log('-----------------------------');*/

    let fs = require('fs');

    let conversion = require("phantom-html-to-pdf")();
    console.log("Generating PDF...")
    conversion({
        html: html_priv,
        allowLocalFilesAccess: true,
        phantomPath: require("phantomjs-prebuilt").path,
        settings: {
                javascriptEnabled : true,
                resourceTimeout: 10000
            },
            paperSize: {
                format: 'A4',
                orientation: 'portrait',
                margin: {
                    top: "0in",
                    left: "0in",
                    right:"0in"
                },
            },
    }, function(err, pdf) {
        if (err) return console.log(err);
        let output = fs.createWriteStream(`${walletsDir}/${fileName}-priv.pdf`);
        //console.log(pdf.logs);
        //console.log(pdf.numberOfPages);
        // since pdf.stream is a node.js stream you can use it
        // to save the pdf to a file (like in this example) or to
        // respond an http request.
        pdf.stream.pipe(output);
        conversion.kill();
        conversion({
            html: html_pub,
            allowLocalFilesAccess: true,
            phantomPath: require("phantomjs-prebuilt").path,
            settings: {
                    javascriptEnabled : true,
                    resourceTimeout: 10000
                },
                paperSize: {
                    format: 'A4',
                    orientation: 'portrait',
                    margin: {
                        top: "0in",
                        left: "0in",
                        right:"0in"
                    },
                },
        }, function(err, pdf) {
            if (err) return console.log(err);
            let output = fs.createWriteStream(`${walletsDir}/${fileName}-pub.pdf`);
            //console.log(pdf.logs);
            //console.log(pdf.numberOfPages);
            // since pdf.stream is a node.js stream you can use it
            // to save the pdf to a file (like in this example) or to
            // respond an http request.
            pdf.stream.pipe(output);
            conversion.kill();
            cb();
        });
    });
}

function generateWithTemplate(address, suffix, ext, template, walletsDir, pos, page, cb) {
    const divQR = `
    <img style="position:absolute;left:0px;top:0px;height:${page.height}in;width:${page.width}in;overflow:hidden" src="file://${template}"/> 
        <div style="position:absolute;left:${pos.x};top:${pos.y};background-color:#FFFFFF;width:${pos.sizes.width+10}px;height:${pos.sizes.height}px;" >
            <div style="position:realtive;text-align:center;font-family:sans-serif;font-weight:bolder;margin-top:5px;font-size:${pos.sizes.font}px;color:#000000" >
                ${address.substring(0,8)+"......"+address.substring(address.length-7)}
            </div>
            <img src="file://${walletsDir}/${address.substring(0,8)+suffix+ext}"
                style="display:block;margin-left:auto;margin-right:auto;width:${pos.sizes.width}px;height:${pos.sizes.height}px"
            />
        </div>`;
    

    const html = `<html>
        <head>
            <link href="https://fonts.googleapis.com/css?family=Limelight" rel="stylesheet">
            <style>
                html {
                    height: 0;
                    transform-origin: 0 0;
                    -webkit-transform-origin: 0 0;
                    transform: scale(0.8666);
                    -webkit-transform: scale(0.8666);
                }

                body {
                    width: ${page.width};
                    height: ${page.height};
                    padding: 0;
                    margin: 0;
                    font-family: 'Limelight', cursive;
                    transform-origin: 0 0;
                    -webkit-transform-origin: 0 0;
                    transform: scale(0.8666);
                    -webkit-transform: scale(0.8666);
                }
                
                .page {
                    width: ${page.width};
                    height: ${page.height};
                    padding: 0;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            ${divQR}
        </body></html>`;
    
    

    /*console.log('------------html-------------');
    console.log(html);
    console.log('-----------------------------');*/
    let fs = require('fs');

    let conversion = require("phantom-html-to-pdf")();
    console.log("Generating PDF...")
    conversion({
        html: html,
        allowLocalFilesAccess: true,
        phantomPath: require("phantomjs-prebuilt").path,
        settings: {
                javascriptEnabled : true,
                resourceTimeout: 10000
            },
        paperSize: {
            width: page.width,
            height: page.height,
            margin: "0px",
            headerHeight: "0px",
            footerHeight: "0px"
        },
        fitToPage: true
    }, function(err, pdf) {
        if (err) return console.log(err);
        let output = fs.createWriteStream(`${walletsDir}/${address.substring(0,8)+suffix}.pdf`);
        //console.log(pdf.logs);
        //console.log(pdf.numberOfPages);
        // since pdf.stream is a node.js stream you can use it
        // to save the pdf to a file (like in this example) or to
        // respond an http request.
        pdf.stream.pipe(output);
        conversion.kill();
        cb();
    });
}

module.exports = { getBalance, sendFunds, generateWallet, generateStickers, generateStickersHTML, generateWithTemplate,sleep }