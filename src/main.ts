import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as express from 'express';
import * as sugar from 'sugar';
import * as winston from 'winston';
import { PageRegistry } from './context';
import { renderPage } from './renderer';
import { generateGalaxyReference, generateGalaxyUsage } from './generator';
import { generateLayoutsReference } from './layouts/usage';
import { reindexLayouts } from './layouts/generator';

export const logger = new (winston.Logger)({
    level: 'debug',

    transports: [
        new (winston.transports.Console)({
            colorize: true,
            prettyPrint: true,
            timestamp: function() {
                return sugar.Date.format(new Date(Date.now()), '{HH}:{mm}:{ss}.{SSS}');
            },
        }),
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
            res.send(JSON.stringify(Array.from(registry.pages.keys())));
        }
    });
    app.use(express.static('_site'));
    // app.get('/', (req, res) => {
    //     res.send(renderPage());
    // });

    logger.info('Starting local server..');
    app.listen(3100);
}

async function reindex() {
    const galStore = await generateGalaxyReference();
    // const galStore = <GalaxyStore>yaml.load(fs.readFileSync('_data/galaxy.yml', 'utf8'));
    await generateGalaxyUsage(galStore);
    fs.writeFileSync('_data/galaxy.yml', yaml.dump(galStore));
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
    case 'reindex': reindex(); break;
    case 'reindex:layouts': reindexLayouts(); break;
    case 'build': build(); break;
    case 'server':
    default:
        startServer(); break;
}
