require('source-map-support/register');

const { Costume, Project } = require('sb-edit');

const { spawn } = require('child_process');
const { stringify } = require('./stringify');
const fs = require('fs');
const path = require('path');
const util = require('util');

const mkdirpp = util.promisify(require('mkdirp'));
const rimrafp = util.promisify(require('rimraf'));

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);

function promisifyProcess(proc, showLogging = true) {
    // Takes a process (from the child_process module) and returns a promise
    // that resolves when the process exits (or rejects, if the exit code is
    // non-zero).

    return new Promise((resolve, reject) => {
        if (showLogging) {
            proc.stdout.pipe(process.stdout)
            proc.stderr.pipe(process.stderr)
        }

        proc.on('exit', code => {
            if (code === 0) {
                resolve()
            } else {
                reject(code)
            }
        })
    })
}

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
    async "leopard"(project, util) {
        if (!project.toLeopard) {
            console.error("toLeopard isn't implemented!");
            process.exit(1);
        }
        await progressPromiseAll('Writing files', Object.entries(project.toLeopard({
            leopardJSURL: "leopard.esm.js",
            leopardJSCSSURL: "leopard.min.css",
            getAssetURL: util.getAssetPath
        })).map(([ filename, contents ]) => util.writeQuiet(filename, contents)));

        const js = (await readFile("node_modules/leopard/dist/index.esm.js")).toString();
        await util.writeQuiet("leopard.esm.js", js.replace("index.esm.js.map", "leopard.esm.js.map"));

        await util.copyQuiet("node_modules/leopard/dist/index.esm.js.map", "leopard.esm.js.map");
        await util.copyQuiet("node_modules/leopard/dist/index.min.css", "leopard.min.css");
        await util.writeAssets();
    },

    async "sb2"(project, util) {
        if (!project.toSb2) {
            console.error("toSb2 isn't implemented!");
            process.exit(1);
        }

        const { json, counterMap } = project.toSb2({
            getSoundFormat(sound) {
                // TODO: Implement ADPCM/Squeak(?) sound detection.
                return "";
            }
        })

        const prettyJSON = stringify(JSON.parse(json));
        await util.write("project.json", prettyJSON);

        await util.writeAssets(asset => {
            const index = counterMap[asset.ext].indexOf(asset)
            return `${index}.${asset.ext}`;
        });

        await util.zip("sb2");
    },

    async "sb3"(project, util) {
        if (!project.toSb3) {
            console.error("toSb3 isn't implemented!");
            process.exit(1);
        }

        const { json } = project.toSb3({
            warn: message => console.warn(`\x1b[33m${message}\x1b[0m`)
        });
        const prettyJSON = stringify(JSON.parse(json));
        await util.write("project.json", prettyJSON);
        await util.writeAssets();
        await util.zip("sb3", true);
    },

    async "scratchblocks"(project, util) {
        if (!project.toScratchblocks) {
            console.error("toScratchblocks isn't implemented!");
            process.exit(1);
        }

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

    const basename = path.basename(process.argv[2], path.extname(process.argv[2]));

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
        async copyQuiet(sourceFilename, filename) {
            const out = path.join(this.getOutputDirectory(), filename);
            await mkdirpp(path.dirname(out));
            await copyFile(sourceFilename, out);
        },
        async writeAssets(getAssetPath = this.getAssetPath) {
            const allAssets = [project.stage, ...project.sprites].reduce((acc, target) => acc.concat(target.costumes, target.sounds), []);
            await progressPromiseAll('Writing assets', allAssets.map(asset => this.writeQuiet(getAssetPath(asset), Buffer.from(asset.data || asset.asset))));
        },
        async zip(ext = "zip", showLogging = true) {
            const out = this.getOutputDirectory();
            const zip = spawn("zip", [`${basename}.${ext}`, ...await readdir(out)], {cwd: out});
            await promisifyProcess(zip, showLogging);
        }
    };

    await rimrafp(util.getOutputDirectory());
    await mkdirpp(util.getOutputDirectory());

    await outputHandlers[process.argv[3]](project, util);

    console.log(`Wrote to directory ${util.getOutputDirectory()}`);
}

main().catch(err => console.error(err));
