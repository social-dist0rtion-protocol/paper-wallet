const { generateWallet, generateStickersHTML } = require('./helpers');
const util = require('util');
const asyncStickers = util.promisify(generateStickersHTML);
var merge = require('easy-pdf-merge');
var fs = require('fs');

const URL = "https://planeta.leap.rocks";
const HOWMANY = 25;
const PATH = 'wallets';
const BATCH = 'usb';
const workDir = process.cwd();
const positions = { 
    x:[50, 200, 350], //absolute X and Y positions for sticker elemnts on page
    y:[0 ,170, 450, 620],
    sizes: {
        priv: {
            font: 10,
            height: 136,
            width: 136
        },
        addr: {
            font: 9,
            height: 95,
            width: 95
        }
    }
}

async function generate() {
    let accounts = [];
    let sources_priv = [];
    let sources_pub = [];
    const perPage = positions.x.length * positions.y.length;
    const pages = Math.ceil(HOWMANY / perPage);

    for (let i = 0; i < HOWMANY; i++) {
        accounts.push(generateWallet(URL, `./${PATH}`,BATCH));
    }
    let pageAccounts;
    let name;
    console.log('--------------');
    console.log(accounts);
    for (let i = 0; i < pages; i++) {
        pageAccounts = accounts.slice(i * perPage, (i + 1) * perPage);
        console.log('--------------');
        console.log(pageAccounts);
        name = `Batch-${BATCH}_${pageAccounts[0].substring(0,8)}`;
        await asyncStickers(pageAccounts, workDir + '/' + PATH, name, positions);
        console.log("Generated: " + name);
        sources_priv[i] = (""+PATH+"/"+name+"-priv.pdf");
        sources_pub[i] = (""+PATH+"/"+name+"-pub.pdf");
    }

    if (pages > 1) {
        console.log('Merging private key QR codes');
        merge(sources_priv,PATH + "/wallets-" + BATCH + "-priv.pdf",function(err){
                if(err)
                return console.log(err);
                console.log('Success');
                var i = sources_priv.length;
                sources_priv.forEach(function(filepath){
                    console.log("Cleaning up "+filepath)
                    fs.unlinkSync(filepath);
                });
        });

        console.log('Merging address QR codes');
        merge(sources_pub,PATH + "/wallets-" + BATCH + "-addr.pdf",function(err){
                if(err)
                return console.log(err);
                console.log('Success');
                var i = sources_pub.length;
                sources_pub.forEach(function(filepath){
                    console.log("Cleaning up "+filepath)
                    fs.unlinkSync(filepath);
                });
        });
    }
}

generate();
