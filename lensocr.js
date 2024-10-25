#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Lens from './src/index.js';

let image = true, uuid;

async function cli(args) {
    if (args.includes('-d')) {
        args.splice(args.indexOf('-d'), 1);
    }

    // if (args.includes('-c')) {
    //     const index = args.indexOf('-c');
    //     uuid = args[index + 1];
    //     args.splice(index, 2);
    // }

    // if (!uuid) {
    //     console.log('UUID by -c option must be set.')
    //     return
    // }

    // check empty arguments at last
    if (!args.length || args.includes('-h') || args.includes('--help')) {
        console.log('Scan text from image using Google Lens and copy to clipboard.');
        console.log('');
        console.log('USAGE:');
        console.log('    chrome-lens-ocr [-d] [-c uuid] ./path/to/image.png');
        console.log('    chrome-lens-ocr [-d] [-c uuid] https://domain.tld/image.png');
        console.log('    chrome-lens-ocr --help');
        console.log('ARGS:');
        console.log('    -d         Do not copy text to clipboard');
        // console.log('    -c uuid    Specify UUID for cookies file');
        console.log('    -h, --help Show this message');
        return;
    }

    // hope the last argument is the image
    image = args[0];

    // get path to cookies file (should be in the same directory as this script)
    const moduleUrl = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(moduleUrl);
    // const pathToCookies = path.join(__dirname, `${uuid}_cookies.json`);

    // check file access
    // try {
    //     fs.accessSync(pathToCookies, fs.constants.R_OK | fs.constants.W_OK);
    // } catch (error) {
    //     if (error.code === 'EACCES') {
    //         console.warn(
    //             'Cannot write cookie, read/write permission denied in',
    //             pathToCookies
    //         );
    //     }
    // }

    // read cookies from file
    let cookie;

    // if (fs.existsSync(pathToCookies)) {
    //     cookie = JSON.parse(fs.readFileSync(pathToCookies, 'utf8'));
    // }

    // create lens instance, with cookie if exists
    const lensOptions = cookie ? { headers: { cookie } } : {};
    const lens = new Lens(lensOptions);
    let text, lensResult;

    // remove Windows drive prefix because false positive
    if (URL.canParse(image.replace(/^\w{1}:/, ''))) {
        lensResult = await lens.scanByURL(image);
    } else {
        lensResult = await lens.scanByFile(image);
    }

    if (!lensResult || !lensResult.segments || lensResult.segments.length === 0) return

    const result = []
    for (let i in lensResult.segments) {
        const seg = lensResult.segments[i]
        const xMin = seg.boundingBox.pixelCoords.x
        const yMin = seg.boundingBox.pixelCoords.y
        const xMax = xMin + seg.boundingBox.pixelCoords.width
        const yMax = yMin + seg.boundingBox.pixelCoords.height
        const coordinates = [[xMin, yMin],[xMax, yMin],[xMax, yMax],[xMin, yMax]]
        result.push({ coordinates, text: seg.text, confidence: 0.98 })
    }
    console.log(JSON.stringify(result, '', 4))
    // write cookies to file
    // fs.writeFileSync(
    //     pathToCookies,
    //     JSON.stringify(lens.cookies, null, 4),
    //     { encoding: 'utf8' }
    // );
    return result;
}

// only run if directly executed
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const args = process.argv.slice(2);
        await cli(args);
    } catch (e) {
        console.error('Error occurred:');
        console.error(e);
    }
}

export default cli;
