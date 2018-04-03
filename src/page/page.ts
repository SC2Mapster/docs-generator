import { PageRegistry } from "../context";

export function slugify(str: string) {
    str = str.replace(/[_\\:<>]/g, '-');
    str = str.replace('AI', 'Ai');
    str = str.replace('UI', 'Ui');
    str = str.replace(/[A-Z]+/g, (m) => '-' + m.toLowerCase());
    str = str.replace(/(^[\-]+)|([\-]+$)/g, '');
    str = str.replace(/[\/]+/g, '');
    str = str.replace(/\s*\-+\s*/g, '-');
    return str;
}

export type PageParams = {};

export type PageOptions = {
    title?: string;
    template?: string;
    slug?: string;
    prepare?: () => PageParams;
    listChildren?: boolean;
};

export abstract class PageDefinition {
    permalink: string;
    registry: PageRegistry;
    options: PageOptions;
    params: PageParams;

    constructor() {
        this.options = {};
    }

    get vars() {
        if (!this.params) {
            if (!this.options.prepare) return {};
            this.params = this.options.prepare();
        }
        return this.params;
    }

    abstract get title(): string;
    abstract get slug(): string;

    get template() {
        return this.options.template ? this.options.template : 'page/default.nj';
    }

    get fullTitle() {
        let page: PageDefinition = this;
        const titles: string[] = [];
        while (page) {
            titles.push(page.title);
            page = page.parent;
        }
        return titles.join(' / ');
    }

    get children() {
        const children: PageDefinition[] = [];
        for (const [permalink, page] of this.registry.pages) {
            if (!page.permalink.startsWith(this.permalink)) continue;
            if (page === this) continue;
            if (page.permalink.indexOf('/', this.permalink.length + 1) !== -1) continue;
            children.push(page);
        }
        return children;
    }

    get parent() {
        const n = this.permalink.lastIndexOf('/');
        if (n === -1) return null;
        return this.registry.pages.get(this.permalink.substr(0, n));
    }
}

export class PageCustom extends PageDefinition {
    constructor(options?: PageOptions) {
        super();
        this.options = options;
    }

    get title() {
        return this.options.title;
    }

    get slug() {
        return this.options.slug ? this.options.slug : slugify(this.options.title);
    }
}

export interface DocElementDefinition {
    name: string;
};

// export type PageDocOptions = PageOptions & {};

export class PageDocDefinition<T extends DocElementDefinition> extends PageCustom {
    def: T;

    constructor(def: T, options?: PageOptions) {
        super(Object.assign(<PageOptions>{
            title: def.name,
            slug: slugify(def.name),
        }, options));
        this.def = def;
    }
}
