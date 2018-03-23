import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { logger } from './main';
import { GalaxyStore, DSourceEntry } from './generator';
import * as ls from './layouts/types';

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
    public layouts: ls.LayoutsStore;

    public pages = new Map<string, PageDefinition>();

    public constructor() {
        logger.info('Populating Galaxy docs..');

        this.populateGalaxy();
        this.populateLayouts();

        this.registerPage(new PageCustom('/', 'SC2 API', 'index.nj'));

        logger.info(`Done, ${this.pages.size} pages registered.`);
    }

    public populateLayouts() {
        this.layouts = <ls.LayoutsStore>yaml.load(fs.readFileSync('_data/layouts.yml', 'utf8'));

        this.registerPage(new LayoutsFrameList(this.layouts));
        for (const name in this.layouts.frame) {
            this.registerPage(new LayoutsFrame(this.layouts, name));
        }
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

    public get vars() {
        return this.params;
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

//
// LAYOUTS
//

export abstract class LayoutsPage extends PageDefinition {
    readonly lstore: ls.LayoutsStore;

    constructor(lstore: ls.LayoutsStore) {
        super();
        this.lstore = lstore;
    }
}

export class LayoutsFrame extends LayoutsPage {
    readonly frameName: string;
    readonly template = 'layouts/frame-show.nj';

    constructor(lstore: ls.LayoutsStore, frameName: string) {
        super(lstore);
        this.permalink = '/layouts/frame/' + slugify(frameName);
        this.frameName = frameName;
        this.title = frameName + ' / Frame / Layouts'
    }

    public get vars() {
        const frame = this.lstore.frame[this.frameName];
        const typeClass = this.lstore.class[frame.class];
        const inheritanceList = [frame.class].concat(typeClass.inherits);
        const classList: ls.Class[] = [];
        const descList: ls.Desc[] = [];

        let fields: ls.ClassField[] = [];
        for (const className of inheritanceList) {
            classList.push(this.lstore.class[className]);
            if (!this.lstore.class[className] || !this.lstore.class[className].fields) continue;
            fields = fields.concat(this.lstore.class[className].fields);
        }

        descList.push(this.lstore.desc[frame.desc]);

        return {
            frame: frame,
            inheritanceList: inheritanceList,
            fields: fields,
            classList: classList,
            descList: descList,
        };
    }
}

export class LayoutsFrameList extends LayoutsPage {
    readonly template = 'layouts/frame-list.nj';

    constructor(lstore: ls.LayoutsStore) {
        super(lstore);
        this.permalink = '/layouts/frame';
        this.title = 'Frame / Layouts'
    }

    public get vars() {
        return {
            lstore: this.lstore
        };
    }
}
