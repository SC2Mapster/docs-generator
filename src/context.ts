import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { logger } from './main';
import { GalaxyStore, DSourceEntry } from './generator';
import * as ls from './layouts/types';
import { loadLayoutsIndex } from './layouts/generator';

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
    public layouts: ls.LayoutsManager;

    public pages = new Map<string, PageDefinition>();

    public constructor() {
        logger.info('Populating Galaxy docs..');
        this.populateGalaxy();
        logger.info('Populating Layouts docs..');
        this.populateLayouts();

        this.registerPage(new PageCustom('/', 'SC2 API', 'index.nj', {
            // content: fs.readFileSync('README.md', { encoding: 'utf8' }),
        }));

        logger.info(`Done, ${this.pages.size} pages registered.`);
    }

    public populateLayouts() {
        this.layouts = loadLayoutsIndex();
        this.registerPage(new LayoutsFrameList(this.layouts));
        for (const name in this.layouts.schema.frames) {
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
    readonly lst: ls.LayoutsManager;

    constructor(lst: ls.LayoutsManager) {
        super();
        this.lst = lst;
    }
}

export class LayoutsFrame extends LayoutsPage {
    readonly frameName: string;
    readonly template = 'layouts/frame-show.nj';

    constructor(lstore: ls.LayoutsManager, frameName: string) {
        super(lstore);
        this.permalink = '/layouts/frame/' + slugify(frameName);
        this.frameName = frameName;
        this.title = frameName + ' / Frame / Layouts'
    }

    public get vars() {
        const frame = this.lst.schema.frames[this.frameName];
        const typeClass = this.lst.schema.classes[frame.classType];
        let inheritanceList: string[] = [];
        try {
            inheritanceList = typeClass.inheritanceList;
        } catch (e) {
            inheritanceList = ['CFrame'];
        }
        const classList: ls.Class[] = [];
        const descList: ls.Desc[] = [];

        for (const className of inheritanceList) {
            if (!this.lst.schema.classes[className]) continue;
            classList.push(this.lst.schema.classes[className]);

            // for (const [fieldName, fieldItem] in this.lstore.classes[className])
        }

        // this.lstore.refs.fieldOccurences

        return {
            lst: this.lst,
            frame: frame,
            inheritanceList: inheritanceList,
            classList: classList,
            descList: descList,
            occurrences: this.lst.refs.frameOccurences[this.frameName],
            fieldOccurrences: this.lst.refs.fieldOccurences,
        };
    }
}

// export class LayoutsClassField extends LayoutsPage {
//     readonly className: string;
//     readonly fieldName: string;
//     readonly template = 'layouts/frame-field.nj';

//     constructor(lstore: ls.LayoutsManager, className: string, fieldName: string) {
//         super(lstore);
//         this.permalink = `/layouts/frame/${slugify(className)}/field/${slugify(fieldName)}`;
//         this.className = className;
//         this.fieldName = fieldName;
//         this.title = `${className} / ${className} / Frame / Layouts`
//     }

//     public get vars() {
//         const frame = this.lst.schema.frames[this.className];
//         const typeClass = this.lst.schema.classes[frame.classType];
//         const inheritanceList = typeClass.inheritanceList;
//         const classList: ls.Class[] = [];
//         const descList: ls.Desc[] = [];

//         for (const className of inheritanceList) {
//             if (!this.lst.schema.classes[className]) continue;
//             classList.push(this.lst.schema.classes[className]);
//         }

//         return {
//             metadata: this.lst.metadata,
//             frame: frame,
//             inheritanceList: inheritanceList,
//             classList: classList,
//             descList: descList,
//             occurrences: this.lst.refs.frameOccurences[this.className],
//             fieldOccurrences: this.lst.refs.fieldOccurences,
//         };
//     }
// }

export class LayoutsFrameList extends LayoutsPage {
    readonly template = 'layouts/frame-list.nj';

    constructor(lstore: ls.LayoutsManager) {
        super(lstore);
        this.permalink = '/layouts/frame';
        this.title = 'Frame / Layouts'
    }

    public get vars() {
        return {
            lstore: this.lst,
            // categoryFrameMap: this.,
        };
    }
}
