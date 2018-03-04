import * as markdown from 'markdown-it';
// import * as markdownItTocAndAnchor from 'markdown-it-toc-and-anchor';
import { PageDefinition, GalaxyApiEntry, PageDefault, slugify } from './context';
import { DFunction, DKind, DFunctionParameter, DSourceEntry, DCategoryList, DPreset } from './generator';
import * as hljs from 'highlight.js';

// ---
// TODO: MOST OF THIS SHIT MUST BE MOVED TO PROPER TEMPLATING SYSTEM
// ---

const markdownItTocAndAnchor = require('markdown-it-toc-and-anchor').default;
const md = markdown({
    typographer: true,
    highlight: function(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return (
                    '<pre class="hljs"><code>' +
                    hljs.highlight(lang, str, true).value +
                    "</code></pre>"
                );
            } catch (__) {
                return "";
            }
        }

        return (
            '<pre class="hljs"><code>' +
            md.utils.escapeHtml(str) +
            "</code></pre>"
        );
    }
}).use(markdownItTocAndAnchor, {});

const html = (strings: TemplateStringsArray, ...values: any[]) =>
values.reduce((acc, v, i) => acc + (Array.isArray(v) ? v.join('\n') : String(v)) + strings[i + 1], strings[0]);

const tplRoot = (title: string, content: string) => html`
<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="/dist/bootstrap.min.css">
        <link rel="stylesheet" href="/dist/monokai.css">
        <title>${title}</title>
    </head>
    <body>
        <div class="container">
            ${content}
        <div>
    </body>
</html>
`;

function getRelated(page: GalaxyApiEntry) {
    const related: GalaxyApiEntry[] = [];

    const list = page.registry.galaxy.categoryEntryMap[page.dentry.rootCategory];
    if (list) {
        for (const item of list) {
            related.push(page.registry.galaxyEntryPages.get(item));
        }
    }

    return related;
}

function renderExamples(page: GalaxyApiEntry) {
    const list = page.registry.galaxy.usageTable[page.dentry.id];
    if (!list) return '--- None found ---';

    const o: string[] = [];
    let previousFile: string = null;
    for (const item of list) {
        const fname = /([^\/]+)$/.exec(item.sourceLink)[1].split('#');
        if (previousFile !== fname[0]) {
            o.push(`##### ${item.modName} --- *[${fname[0]}](${item.sourceLink})*`);
        }
        o.push('```c\n' + '// ' + fname[1] + '\n' + item.sourceLine + '\n```');
        previousFile = fname[0];
    }
    return o.join('\n');
}

function renderGalaxyType(type: DFunctionParameter) {
    if (!type) return '`void`';
    const s: string[] = [];
    s.push('`');
    s.push(type.galaxyType);
    s.push('`');
    if (type.type !== type.galaxyType) {
        s.push(` *[ ${type.type}`)
        if (type.gameLink) s.push('::' + type.gameLink);
        if (type.preset) s.push('::' + `[${type.preset.replace(/^Preset/, '')}](/galaxy/reference/${slugify(type.preset)})`);
        s.push(' ]*');
    }
    if (type.name) {
        s.push(` --- ${type.name}`);
    }
    return s.join('');
}

function wrapCode(code: string) {
    if (code.length < 60) return code;
    const m = code.match(/^([^\(]+\()([^\)]+)(\);)$/);
    if (m) {
        let o: string[] = [];
        o.push(m[1]);
        o = o.concat(m[2].split(',').map((item) => '\t' + item.trim() + ','));
        o.push(m[3]);
        return o.join('\n');
    }
    return code;
}

const tplGalaxyPreset = (entry: DPreset) => html`
Base type --- \`${entry.baseType}\`

Name | Identifier | Code
--- | --- | ---
${entry.presets.map((item) => {
    return `**${item.name}** | *${item.rawName || ''}* | ${item.rawCode ? '`' + item.rawCode.replace(/^[^=]+=\s*/, '').replace(';', '') + '`' : '---'}`;
}).join('\n')}

---
`

const tplGalaxyFunction = (entry: DFunction) => html`
${entry.grammar ? `> *Grammar* --- ${entry.grammar.replace(/~/g, '__')}` + (entry.flags ? '\\\n' : '') : ''}` +
`${entry.flags ? `> *Flags* --- ${entry.flags.map((item) => `\`${item}\``).join(' | ')}` : ''}
${entry.hint ? '\n' + entry.hint.replace(/"([^"]+)"/g, '*"$1"*') : ''}
`+ (!entry.parameters.length ? '' : (html`
#### Arguments\n
${entry.parameters.map((param) => {
    return '- ' + renderGalaxyType(param);
}).join('\n')}
`)) + html`
Returns --- ${renderGalaxyType(entry.returnType)}
${entry.rawCode ? '\n```c\n' + wrapCode(entry.rawCode) + '\n```' : ''}`
;
// (dfunc.flags.length ? ' \\' : '')

const tplGalaxyEntry = (page: GalaxyApiEntry) => html`
## ${page.dentry.name}
${tplKind[page.dentry.kind](page.dentry)}

#### Related

Category: [${page.dentry.categories[page.dentry.categories.length - 1]}](/galaxy/reference)

${getRelated(page).map((item) => renderListItem(item))}

#### Examples

${renderExamples(page)}
`

const tplKind: any = {
    [DKind.Function]: tplGalaxyFunction,
    [DKind.Preset]: tplGalaxyPreset,
}

//

// const tplGalaxyIndex = (page: PageDefault)

//

function renderListItem(itemPage: GalaxyApiEntry) {
    const o: string[] = [];
    const entry = itemPage.dentry;

    o.push('- ');
    o.push('***[' + entry.kind.substr(0, 1) + ']***');
    if (entry.kind === DKind.Function) {
        o.push(' --- ' + renderGalaxyType((<DFunction>entry).returnType));
    }
    o.push(` --- **[${itemPage.title}](${itemPage.permalink})**`);

    if (entry.kind === DKind.Function) {
        o.push(' --- ( ');
        if ((<DFunction>entry).parameters.length) {
            o.push((<DFunction>entry).parameters.map((item) => '' + item.galaxyType + '').join(' **,** '));
        }
        else {
            o.push('void');
        }
        o.push(' )');
    }

    o.push('\n')

    return o.join('');
}

function renderDefaultPage(page: PageDefault) {
    function renderCategoryList(list: DCategoryList, depth = 0) {
        const o: string[] = [];
        if (page.registry.galaxy.categoryEntryMap[list.fullname]) {
            if (depth !== 0) {
                o.push(`## ${list.fullname}\n`);
            }

            for (const key in page.registry.galaxy.categoryEntryMap[list.fullname]) {
                const item = page.registry.galaxy.categoryEntryMap[list.fullname][key];
                const itemPage = page.registry.galaxyEntryPages.get(item);
                o.push(renderListItem(itemPage));
            }
        }

        for (const category of list.categories) {
            o.push(renderCategoryList(category, depth + 1) + '\n');
        }
        o.push('\n');
        return o.join('');
    }

    switch (page.permalink) {
        case '/galaxy/reference':
        {
            const o: string[] = [];
            o.push(`# ${page.title}\n`);
            o.push(renderCategoryList(page.registry.galaxy.listing));
            return o.join('');
        }

        default:
        {
            return '# 404';
        }
    }
}

export function renderPage(page: PageDefinition) {
    let content: string;

    switch (page.constructor) {
        case GalaxyApiEntry:
        {
            content = tplGalaxyEntry(<GalaxyApiEntry>page);
            break;
        }
        case PageDefault:
        {
            content = renderDefaultPage(<PageDefault>page);
            break;
        }
    }

    content = md.render(content);
    content = content.replace(/<table>/g, '<table class="table table-striped">')
    return tplRoot(page.title, content);
}
