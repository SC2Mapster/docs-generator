import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { logger } from './main';
import { GalaxyStore, DSourceEntry } from './generator';

export function slugify(str: string) {
    str = str.replace(/[_\/\\]/g, '-');
    str = str.replace('AI', 'Ai');
    str = str.replace('UI', 'Ui');
    str = str.replace(/[A-Z]+/g, (m) => '-' + m.toLowerCase());
    str = str.replace(/^[\-]+/, '');
    str = str.replace(/\-+/g, '-');
    return str;
}

export class DocsRegistry {
    public galaxy: GalaxyStore;
    public galaxyEntryPages = new Map<string, GalaxyApiEntry>();

    public pages = new Map<string, PageDefinition>();

    public constructor() {
        logger.info('Populating Galaxy docs..');
        this.populateGalaxy();
        logger.info(`Done, ${this.pages.size} pages registered.`);
    }

    public populateGalaxy() {
        this.galaxy = <GalaxyStore>yaml.load(fs.readFileSync('_data/galaxy.yml', 'utf8'));

        for (const name in this.galaxy.entries)  {
            const page = <GalaxyApiEntry>this.registerPage(new GalaxyApiEntry(name, this.galaxy.entries[name]));
            this.galaxyEntryPages.set(page.dentry.id, page);
        }

        this.registerPage(new PageDefault('Galaxy API Reference', '/galaxy/reference'));
    }

    private registerPage(page: PageDefinition) {
        if (this.pages.has(page.permalink)) throw Error();
        this.pages.set(page.permalink, page);
        page.registry = this;
        return page;
    }
}

export abstract class PageDefinition {
    title: string;
    permalink: string;
    content?: string;
    registry: DocsRegistry;
}

export class PageDefault extends PageDefinition {
    constructor(title: string, permalink: string, content?: string) {
        super();
        this.title = title;
        this.permalink = permalink;
        this.content = content;
    }
}

export class GalaxyApiEntry extends PageDefinition {
    dentry: DSourceEntry;

    constructor(name: string, entry: DSourceEntry) {
        super();
        this.title = entry.name;
        this.permalink = '/galaxy/reference/' + slugify(name);
        this.dentry = entry;
    }
}
