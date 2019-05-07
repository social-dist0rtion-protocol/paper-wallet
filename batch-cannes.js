const { generateWallet, generateWithTemplate } = require('./helpers');
const util = require('util');
const applyTemplate = util.promisify(generateWithTemplate);
var merge = require('easy-pdf-merge');
var fs = require('fs');

const URL = "https://cannes.motion.ooo";
const HOWMANY = 10;
const PATH = 'wallets';
const BATCH = '0';
const workDir = process.cwd();
const templates = {
    addr: `${workDir}/Flyer_Test 23b-1.svg`,
    priv: `${workDir}/Flyer_Test 23b-2.svg`
};
const positions = {
    priv: {
        x:140,
        y:270,
        sizes: {
            font: 10,
            height: 120,
            width: 120
        }
    },
    addr: {
        x:170,
        y:330,
        sizes: {
            font: 9,
            height: 90,
            width: 90
        }
    }
};
const page = {
    width: '3.94in',
    height: '8.27in',
};

async function generate() {
    let address;
    let sources = [];

    for (let i = 0; i < HOWMANY; i++) {
        address = generateWallet(URL, `./${PATH}`,BATCH);
        await applyTemplate(
            address, 
            '',
            '.svg', 
            templates.addr,
            workDir + '/' + PATH, 
            positions.addr,
            page);
        sources.push(""+PATH+"/"+address.substring(0,8)+".pdf");
        await applyTemplate(
            address, 
            '-priv',
            '.png',
            templates.priv,
            workDir + '/' + PATH, 
            positions.priv,
            page);
        sources.push(""+PATH+"/"+address.substring(0,8)+"-priv.pdf");
    }

    console.log('Merging PDFs...');
    merge(sources,PATH + "/wallets-" + BATCH + ".pdf",function(err){
            if(err)
            return console.log(err);
            console.log('Success');
            var i = sources.length;
            sources.forEach(function(filepath){
                console.log("Cleaning up "+filepath)
                fs.unlinkSync(filepath);
            });
    });
}

generate();
