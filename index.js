const { Project } = require('sb-edit');
const fs = require('fs');
const util = require('util');
const path = require('path');

const mkdirpp = util.promisify(require('mkdirp'));
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

function progressPromiseAll(msg, array) {
    let done = 0, total = array.length;
    process.stdout.write(`\r${msg} [0/${total}]`);
    return Promise.all(array.map(promise => promise.then(val => {
        done++;
        if (done === total) {
            process.stdout.write(`\r\x1b[2m${msg} [${done}/${total}] \x1b[0;32mDone!\x1b[0m \n`)
        } else {
            process.stdout.write(`\r${msg} [${done}/${total}]`);
        }
        return val;
    })));
};

const outputHandlers = {
    async "scratch-js"(project, util) {
        await progressPromiseAll('Writing files', Object.entries(project.toScratchJS({
            scratchJSURL: "/scratch-js/index.mjs",
            scratchJSCSSURL: "/scratch-js/index.css",
            getAssetURL: util.getAssetPath
        })).map(([ filename, contents ]) => util.writeQuiet(filename, contents)));
        await util.writeAssets();
    },
    async "scratchblocks"(project, util) {
        await progressPromiseAll('Writing files', Object.entries(project.toScratchblocks())
            .map(([ target, contents ]) => util.writeQuiet(target + '.txt', contents))
        );
    }
};

async function main() {
    if (!process.argv[2]) {
        console.error("Please specify an sb3 to open.");
        process.exit(1);
    }

    if (!process.argv[3] || !Object.keys(outputHandlers).includes(process.argv[3])) {
        console.error("Please specify an output format:");
        console.error(Object.keys(outputHandlers).map(line => "- " + line).join("\n"));
        process.exit(1);
    }

    const file = await readFile(process.argv[2]);
    const project = await Project.fromSb3(file);

    const util = {
        getAssetPath({md5, ext}) {
            return `${md5}.${ext}`;
        },
        getOutputDirectory() {
            return path.join("out", process.argv[3]);
        },
        async write(filename, data) {
            const out = path.join(this.getOutputDirectory(), filename);
            process.stdout.write(out + "...");
            await this.writeQuiet(filename, data);
            process.stdout.write("done!\n");
        },
        async writeQuiet(filename, data) {
            const out = path.join(this.getOutputDirectory(), filename);
            await mkdirpp(path.dirname(out));
            await writeFile(out, data);
        },
        async writeAssets() {
            const allAssets = [project.stage, ...project.sprites].reduce((acc, target) => acc.concat(target.costumes, target.sounds), []);
            await progressPromiseAll('Writing assets', allAssets.map(asset => this.writeQuiet(this.getAssetPath(asset), Buffer.from(asset.asset))));
        }
    };

    await outputHandlers[process.argv[3]](project, util);

    console.log(`Wrote to directory ${util.getOutputDirectory()}`);
}

main().catch(err => console.error(err));
