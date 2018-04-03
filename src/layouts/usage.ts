import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as yaml from 'js-yaml';
import * as sax from 'sax';
import * as ls from './types';
import { logger } from '../main';

const parser = sax.parser(true, {});

// function parseLayout() {
// }

enum LTagType {
    Desc = 'Desc',
    Frame = 'Frame',
};

const frameIgnoredDescs = [
    'Frame',
    'StateGroup',
    'Animation',
];

class LayoutParser extends sax.SAXParser {
    protected modelsPath: sax.Tag[] = [];
    protected modName: string;
    protected filename: string;
    refStore: ls.RefStore = <ls.RefStore>{
        frameOccurences: {},
        fieldOccurences: {},
    };

    constructor() {
        super(true, {
            position: true,
        });
    }

    protected contextDumpInfo(): ls.RefOccurence {
        return {
            modName: this.modName,
            filename: this.filename,
            sourceUrl: '',
            lineStart: this.line,
            posStart: this.position,
        };
    }

    process(modName: string, filename: string, content: string) {
        this.modName = modName
        this.filename = filename;
        this.write(content).close();
        this.modelsPath = [];
    }

    sanitizeAttrs(attrs: { [key: string]: string }) {
        const nattrs = <{ [key: string]: string }>{};
        for (const key in attrs) {
            nattrs[key.toLowerCase()] = attrs[key];
        }
        return nattrs;
    }

    onopentag(tag: sax.Tag) {
        const currentAttributes = this.sanitizeAttrs(tag.attributes);

        if (frameIgnoredDescs.indexOf(tag.name) === -1) {
            if (tag.name !== LTagType.Frame && this.modelsPath.length) {
                const currentModel = this.modelsPath[this.modelsPath.length - 1];
                if (currentModel.name == LTagType.Frame) {
                    if (!this.refStore.fieldOccurences[tag.name]) {
                        this.refStore.fieldOccurences[tag.name] = [];
                    }
                    this.refStore.fieldOccurences[tag.name].push(<ls.ElementOccurence>{
                        ...this.contextDumpInfo(),
                        frameType: currentModel.attributes['type'],
                        attributes: tag.attributes,
                    });
                }
            }
        }
        if (tag.name === LTagType.Frame) {
            if (!this.refStore.frameOccurences[currentAttributes['type']]) {
                this.refStore.frameOccurences[currentAttributes['type']] = [];
            }
            this.refStore.frameOccurences[currentAttributes['type']].push(<ls.FrameOccurence>{
                ...this.contextDumpInfo(),
            });
        }
        this.modelsPath.push({ ...tag, attributes: { ...currentAttributes } });
    }

    onclosetag(tagName: string) {
        this.modelsPath.pop();
    }
}

export async function generateLayoutsReference() {
    // const lrefStore = <LayoutRefStore>{
    //     frameOccurences: {},
    //     fieldOccurences: {},
    // };
    const parser = new LayoutParser();

    function processMod(directory: string) {
        const files = glob.sync(directory + '/**/*.+(SC2Layout|StormLayout)', {
        });

        for (const filename of files) {
            const modmatch = filename.match(/([^\.\/]+\.(?:sc2campaign|sc2mod|stormmod))\/(.+)/);
            const relativeFilename = modmatch[2];

            logger.info(`Processing: ${modmatch[1]} :: ${relativeFilename}`);
            const s = fs.readFileSync(filename, {encoding: 'utf8'})
            parser.process(modmatch[1], relativeFilename, s);
        }
    }
    processMod('D:/ntdev/sc2-res-v420');
    processMod('D:/ntdev/SC2GameData-master/heroes');
    // processMod('/run/media/kk/nt1/ntdev/sc2-res-v420');
    // processMod('/run/media/kk/nt1/ntdev/SC2GameData-master/heroes');

    return parser.refStore;
}
