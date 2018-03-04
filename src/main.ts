import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as express from 'express';
import * as sugar from 'sugar';
import * as winston from 'winston';
import { DocsRegistry } from './context';
import { renderPage } from './renderer';
import { generateGalaxyReference, generateGalaxyUsage } from './generator';

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

const app = express();
const registry = new DocsRegistry();

function startServer() {
    app.use(express.static('_site'));
    app.use((req, res, next) => {
        const page = registry.pages.get(req.path.replace(/\/+$/, ''));
        logger.debug(`Requested: ${req.path}`);
        if (page) {
            logger.debug(`matched: ${page.constructor.name} :: ${page.title}`);
            res.send(renderPage(page));
        }
        else {
            res.send(JSON.stringify(Array.from(registry.pages.keys())));
        }
    });
    // app.get('/', (req, res) => {
    //     res.send(renderPage());
    // });

    logger.info('Starting local server..');
    app.listen(4000);
}

async function reindex() {
    const galStore = await generateGalaxyReference();
    // const galStore = <GalaxyStore>yaml.load(fs.readFileSync('_data/galaxy.yml', 'utf8'));
    await generateGalaxyUsage(galStore);
    fs.writeFileSync('_data/galaxy.yml', yaml.dump(galStore));
}

function build() {
    const siteDir = '_site';
    for (const page of registry.pages.values()) {
        logger.info(`generating: ${page.permalink}`);

        fs.ensureDirSync(path.join(siteDir, path.dirname(page.permalink)));
        fs.writeFileSync(
            path.join(siteDir, path.dirname(page.permalink), path.basename(page.permalink) + '.html'),
            renderPage(page)
        );
    }
}

switch (process.argv[2]) {
    case 'server': startServer(); break;
    case 'reindex': reindex(); break;
    case 'build': build(); break;
    default: logger.error('unknown cmd'); break;
}
