import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { logger } from './main';
import { GalaxyStore, DSourceEntry } from './generator';

export function slugify(str: string) {
    str = str.replace(/[_\\]/g, '-');
    str = str.replace('AI', 'Ai');
    str = str.replace('UI', 'Ui');
    str = str.replace(/[A-Z]+/g, (m) => '-' + m.toLowerCase());
    str = str.replace(/^[\-]+/, '');
    str = str.replace(/[\/]+/g, '');
    str = str.replace(/\s*\-+\s*/g, '-');
    return str;
}

export class DocsRegistry {
    public galaxy: GalaxyStore;
    public galaxyEntryPages = new Map<string, GalaxyApiEntry>();

    public pages = new Map<string, PageDefinition>();

    public constructor() {
        logger.info('Populating Galaxy docs..');
        this.populateGalaxy();
        this.registerPage(new PageCustom('/', 'SC2 API', 'index.nj'));
        logger.info(`Done, ${this.pages.size} pages registered.`);
    }

    public populateGalaxy() {
        this.galaxy = <GalaxyStore>yaml.load(fs.readFileSync('_data/galaxy.yml', 'utf8'));

        for (const name in this.galaxy.entries)  {
            const page = <GalaxyApiEntry>this.registerPage(new GalaxyApiEntry(name, this.galaxy.entries[name]));
            this.galaxyEntryPages.set(page.params.dentry.id, page);
        }

        this.registerPage(new PageCustom('/galaxy/reference', 'Galaxy API Reference'));
    }

    private registerPage(page: PageDefinition) {
        if (this.pages.has(page.permalink)) throw Error();
        this.pages.set(page.permalink, page);
        page.registry = this;
        return page;
    }
}

export type PageParams = {};

export abstract class PageDefinition {
    permalink: string;
    title: string;
    registry: DocsRegistry;
    template?: string;
    params: PageParams;

    constructor() {
        this.params = {};
    }
}

export class PageCustom extends PageDefinition {

    constructor(permalink: string, title: string, template?: string, params?: {}) {
        super();
        this.permalink = permalink;
        this.title = title;
        this.template = template;
        this.params = params;
    }
}

export class GalaxyApiEntry extends PageDefinition {
    params: {
        dentry: DSourceEntry,
    };

    constructor(name: string, entry: DSourceEntry) {
        super();
        this.title = entry.name;
        this.permalink = '/galaxy/reference/' + slugify(name);
        this.params.dentry = entry;
    }
}
