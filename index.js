const { Project } = require('sb-edit');
const fs = require('fs');
const util = require('util');
const path = require('path');

const mkdirpp = util.promisify(require('mkdirp'));

async function main() {
    if (!process.argv[2]) {
        console.error('Please specify an sb3 to open.');
        process.exit(1);
    }

    const file = fs.readFileSync(process.argv[2]);
    const project = await Project.fromSb3(file);

    /*
    for (const target of [project.stage, ...project.sprites]) {
        console.log(target.name);
        for (const script of target.scripts) {
            console.log(script);
        }
    }
    */

    for (const [ filename, contents ] of Object.entries(project.toScratchJS({
        scratchJSURL: "/scratch-js/index.mjs",
        scratchJSCSSURL: "/scratch-js/index.css"
    }))) {
        const out = 'out/' + filename;
        await mkdirpp(path.dirname(out));
        fs.writeFileSync(out, contents);
        console.log(out);
    }

    for (const target of [project.stage, ...project.sprites]) {
        for (const costume of target.costumes) {
            const out = 'out/' + target.name + '/costumes/' + costume.name + '.' + costume.ext;
            await mkdirpp(path.dirname(out));
            fs.writeFileSync(out, Buffer.from(costume.asset));
            console.log(out);
        }
    }

    /*
    if (!process.argv[3]) {
        console.error('Please specify a target to convert.');
        process.exit(1);
    }

    // console.log(project.toScratchJS()[`${process.argv[3]}/${process.argv[3]}.mjs`]);
    console.log(project.toScratchblocks()[process.argv[3]]);
    */
}

main().catch(err => console.error(err));
