import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { logger } from './main';
import { GalaxyStore, DSourceEntry } from './generator';
import { LayoutsRegistry } from './page/layouts';
import { GalaxyApiEntry } from './page/galaxy';
import { PageDefinition, PageCustom, PageOptions, DocElementDefinition, PageDocDefinition } from './page/page';

export class PageRegistry {
    public galaxy: GalaxyStore;
    public galaxyEntryPages = new Map<string, GalaxyApiEntry>();

    public pages = new Map<string, PageDefinition>();
    public rootPage: PageDefinition;

    public constructor() {
        logger.info('Populating Galaxy docs..');
        this.populateGalaxy();
        logger.info('Populating Layouts docs..');
        (new LayoutsRegistry(this)).install();

        this.rootPage = new PageCustom({
            title: 'SC2 API Docs',
            template: 'index.nj',
            // content: fs.readFileSync('README.md', { encoding: 'utf8' }),
        });
        this.rootPage.permalink = 'index';
        this.installPage(this.rootPage);

        logger.info(`Done, ${this.pages.size} pages registered.`);
    }

    protected populateGalaxy() {
        this.galaxy = <GalaxyStore>yaml.load(fs.readFileSync('_data/galaxy.yml', 'utf8'));
        const galRootPage = this.addPage({
            title: 'Galaxy API',
            slug: 'galaxy',
            listChildren: true,
        });

        const galReference = this.addPage({
            title: 'Reference',
            slug: 'reference',
            listChildren: true,
        }, galRootPage);
        for (const name in this.galaxy.entries)  {
            const page = <GalaxyApiEntry>this.registerPage(new GalaxyApiEntry(this.galaxy.entries[name]), galReference);
            this.galaxyEntryPages.set(page.params.dentry.id, page);
        }
    }

    addPage(options: PageOptions, parent?: PageDefinition) {
        return this.registerPage(new PageCustom(options), parent);
    }

    addDocPage<T extends DocElementDefinition>(def: T, options?: PageOptions, parent?: PageDefinition) {
        return this.registerPage(new PageDocDefinition(def, options), parent);
    }

    registerPage<T extends PageDefinition>(page: T, parent?: PageDefinition) {
        if (parent) {
            page.permalink = `${parent.permalink}/${page.slug}`;
        }
        else {
            page.permalink = page.slug;
        }
        this.installPage(page);
        return page;
    }

    installPage(page: PageDefinition) {
        if (this.pages.has(page.permalink)) {
            logger.error(`${page.permalink} already exists`);
        }
        page.registry = this;
        this.pages.set(page.permalink, page);
    }
}

