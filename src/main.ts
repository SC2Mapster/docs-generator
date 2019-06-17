import * as proc from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as express from 'express';
import * as sugar from 'sugar';
import { createLogger, format, transports } from 'winston';
import { PageRegistry } from './context';
import { renderPage } from './renderer';
import { generateGalaxyReference, generateGalaxyUsage } from './generator';

export const logger = createLogger({
    level: 'debug',
    format: format.combine(format.colorize(), format.simple()),
    transports: [
        new transports.Console(),
    ],
});

function startServer() {
    const app = express();
    const registry = new PageRegistry();
    app.use((req, res, next) => {
        if (req.path.match(/^\/dist\/.+/)) {
            return next();
        }
        let key = req.path.replace(/(?!^)\/+$/, '');
        key = key.replace(/^\//, '');
        const page = registry.pages.get(key);
        logger.debug(`Requested: ${key} :: ${req.path}`);
        if (page) {
            logger.debug(`matched: ${page.constructor.name} :: ${page.title}`);
            res.send(renderPage(page));
            logger.debug('done');
        }
        else {
            return next();
        }
    });
    app.use(express.static('static'));
    app.use(express.static('_site'));
    // app.get('/', (req, res) => {
    //     res.send(renderPage());
    // });

    logger.info('Starting local server..');
    app.listen(3100);
}

async function reindex() {
    const originHash = proc.spawnSync('git', [
        '--git-dir=ext/SC2GameData/.git', 'show-ref', '--hash', 'origin/master'
    ], {
        encoding: 'utf8',
    }).stdout;
    const githubURL = `https://github.com/SC2Mapster/SC2GameData/blob/${originHash.trim()}/`

    const galStore = await generateGalaxyReference();
    await generateGalaxyUsage(galStore, githubURL);
    await fs.ensureDir('_data');
    await fs.writeJSON('_data/galaxy.json', galStore);
    logger.info('Done!');
}

function build() {
    const siteDir = '_site';
    const registry = new PageRegistry();

    for (const page of registry.pages.values()) {
        logger.info(`generating: ${page.permalink}`);

        fs.ensureDirSync(path.join(siteDir, path.dirname(page.permalink)));
        fs.writeFileSync(
            path.join(siteDir, path.dirname(page.permalink), path.basename(page.permalink) + '.html'),
            renderPage(page)
        );
    }
    logger.info('Done!');
}

switch (process.argv[2]) {
    case 'reindex':
    {
        reindex();
        break;
    }
    case 'build':
    {
        build();
        break;
    }
    case 'serve':
    {
        startServer();
        break;
    }
    default:
    {
        logger.error('unknown cmd');
        process.exit(1);
    }
}
