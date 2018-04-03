import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as yaml from 'js-yaml';
import * as ls from './types';
import { generateLayoutsReference } from './usage';
import { logger } from '../main';
import { writeJSONSync, readJsonSync } from 'fs-extra';
import { oentries } from '../util';

export async function reindexLayouts() {
    const schema = <ls.LayoutsSchema>yaml.load(fs.readFileSync('_data/layouts.yml', 'utf8'));
    let refStore: ls.RefStore;

    if (!fs.existsSync('_data/layouts-refs.json')) {
        logger.info('generateLayoutsReference..');
        refStore = await generateLayoutsReference();
        writeJSONSync('_data/layouts-refs.json', refStore);
    }
    else {
        refStore = <ls.RefStore>readJsonSync('_data/layouts-refs.json');
    }

    if (!fs.existsSync('_data/layouts-meta.json') || true) {
        writeJSONSync('_data/layouts-meta.json', generateMetadataStore(schema, refStore), {
            spaces: 4,
        });
    }

    process.exit(0);
}

enum TypeAssumed {
    Boolean = 'bool',
    Integer = 'int32',
    Real = 'real32',
    UInteger = 'uint32',
};
const reTypeAssumptions = new Map<TypeAssumed, RegExp>();
reTypeAssumptions.set(TypeAssumed.Boolean, /^(true|false)$i/);
reTypeAssumptions.set(TypeAssumed.Integer, /^-?\d+$/);
reTypeAssumptions.set(TypeAssumed.UInteger, /^\d+$/);
reTypeAssumptions.set(TypeAssumed.Real, /^-?[\d\.]+$/);
const reIsConst = /^\s?#/;
const reIsVarBound = /@[a-z]/i;
const reIsPresetValue = /^[a-z][a-z\d]*$/i;

type AttrAnalyzeTemp = {
    attrValueCount: number;
    attrRealValueCount: number;
    typeCounter: { [type: string]: number };
    highestInt: number;
    lowestInt: number;
    presetValues: Map<string, string>;
};

function generateFieldsMetadata(schema: ls.LayoutsSchema, refStore: ls.RefStore) {
    function analyzeField(fieldOccurrences: ls.ElementOccurence[], fieldSchema: ls.FieldInfo, fieldKind: ls.ClassFieldDef) {
        const fieldMeta = <ls.FieldMeta>{
            attrs: {},
            occurrenceCount: fieldOccurrences.length,
        };
        const attrsInfo = new Map<string, AttrAnalyzeTemp>();

        for (const occurrence of fieldOccurrences) {
            for (let attrName in occurrence.attributes) {
                const attrValue = occurrence.attributes[attrName].trim();
                attrName = attrName.toLowerCase();
                let currentAttrInfo: AttrAnalyzeTemp;
                if (!attrsInfo.has(attrName)) {
                    currentAttrInfo = {
                        attrValueCount: 0,
                        attrRealValueCount: 0,
                        highestInt: 0,
                        lowestInt: 0,
                        typeCounter: {
                            [TypeAssumed.Boolean]: 0,
                            [TypeAssumed.Real]: 0,
                            [TypeAssumed.UInteger]: 0,
                            [TypeAssumed.Integer]: 0,
                        },
                        presetValues: new Map<string, string>()
                    };
                    attrsInfo.set(attrName, currentAttrInfo);
                }
                else {
                    currentAttrInfo = attrsInfo.get(attrName);
                }

                currentAttrInfo.attrValueCount++;
                if (attrValue.length) {
                    if (attrValue.match(reIsConst) || attrValue.match(reIsVarBound)) continue;
                    currentAttrInfo.attrRealValueCount++;

                    if (attrValue.match(reIsPresetValue) && !currentAttrInfo.presetValues.has(attrValue.toLowerCase())) {
                        currentAttrInfo.presetValues.set(attrValue.toLowerCase(), attrValue);
                    }

                    for (const [typeKind, typeAssumptionTest] of reTypeAssumptions) {
                        if (attrValue.match(typeAssumptionTest)) currentAttrInfo.typeCounter[typeKind]++;
                    }

                    // if (fieldSchema.name === 'Width' && attrName !== 'val') {
                    //     if (attrValue.match(reTypeAssumptions.get(TypeAssumed.Integer)) || true) {
                    //         console.log(occurrence);
                    //     }
                    // }
                }
            }
        }

        for (const [attrName, currentAttrInfo] of attrsInfo) {
            if (fieldOccurrences.length > 100 && currentAttrInfo.attrValueCount / fieldOccurrences.length < 0.002) {
                logger.debug(`low occurrence of attr ${attrName} [${fieldSchema.name}], incorrect?`);
                continue;
            }
            fieldMeta.attrs[attrName] = <ls.FieldMetaAttr>{
                required: currentAttrInfo.attrValueCount === fieldOccurrences.length,
                type: 'unknown',
                occurrenceCount: currentAttrInfo.attrValueCount,
                values: [],
            };
            if (attrName === 'val' && fieldSchema.type && !fieldSchema.type.startsWith('unk')) {
                fieldMeta.attrs[attrName].type = fieldSchema.type;
            }
            else {
                for (const typeKind in currentAttrInfo.typeCounter) {
                    const count = currentAttrInfo.typeCounter[<TypeAssumed>typeKind];
                    if (count === currentAttrInfo.attrRealValueCount) {
                        fieldMeta.attrs[attrName].type = typeKind;
                    }
                }
            }

            if (fieldMeta.attrs[attrName].type === 'unknown') {
                if (
                    (currentAttrInfo.presetValues.size > 1 && currentAttrInfo.presetValues.size < 20) &&
                    (currentAttrInfo.typeCounter[TypeAssumed.Real] / currentAttrInfo.attrRealValueCount < 0.1)
                ) {
                    fieldMeta.attrs[attrName].type = 'CString';
                    fieldMeta.attrs[attrName].values = Array.from(currentAttrInfo.presetValues.values());
                }
            }
        }

        // if (fieldSchema.name === 'Width') {
        //     console.log(attrsInfo);
        //     console.log(fieldMeta);
        // }

        if (fieldKind) {
            for (const attr of oentries(fieldKind.attributes)) {
                if (!fieldMeta.attrs[attr.name]) {
                    fieldMeta.attrs[attr.name] = <ls.FieldMetaAttr>{
                        type: 'unknown',
                        occurrenceCount: 0,
                        values: [],
                    };
                }
                fieldMeta.attrs[attr.name].required = attr.required;
            }

            if (fieldKind.enumValues && fieldKind.enumValues.length) {
                fieldMeta.attrs['val'].values = fieldKind.enumValues;
            }
        }

        if (fieldSchema.flags) {
            fieldMeta.attrs['val'].values = fieldSchema.flags;
        }

        return fieldMeta;
    }

    const classMeta: { [className: string]: ls.ClassMeta; } = {};
    const descMeta: { [descName: string]: ls.DescMeta; } = {};

    for (const className in schema.classes) {
        if (!schema.classes[className]) continue;
        const currentClassMeta = <ls.ClassMeta>{
            fields: {},
        };
        for (const fieldName in schema.classes[className].fields) {
            const field = schema.classes[className].fields[fieldName];
            currentClassMeta.fields[fieldName] = analyzeField(
                refStore.fieldOccurences[fieldName] ? refStore.fieldOccurences[fieldName] : [],
                field,
                schema.classFields[field.fieldKind]
            );
        }
        classMeta[className] = currentClassMeta;
    }

    for (const desc of oentries(schema.descs)) {
        const currentDescMeta = <ls.DescMeta>{
            fields: {},
        };
        for (const field of oentries(desc.fields)) {
            currentDescMeta.fields[field.name] = analyzeField(
                refStore.fieldOccurences[field.name] ? refStore.fieldOccurences[field.name] : [],
                field,
                schema.classFields[field.fieldKind]
            );
        }
        classMeta[desc.name] = currentDescMeta;
    }

    return {
        classMeta: classMeta,
        // descMeta: descMeta,
    };
}

function generateMetadataStore(schema: ls.LayoutsSchema, refStore: ls.RefStore) {
    const meta = <ls.MetadataStore>{
        categoryInfo: [],
        categoryMap: {},
        frameCategoryMap: {},
        ...generateFieldsMetadata(schema, refStore),
    };

    meta.categoryInfo.push({
        name: 'General',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Display',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Control',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Special',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Functional',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'GameUI related',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Units related',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Players related',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Graph',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'LeaderPanel',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Unclassified',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'BattleUI',
        description: '',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Irrelevant',
        description: 'Frames that are not used widely within the UI anymore. Likely the functionality they offered has been taken care of by newer equivalent, offering more flexible implementations. Or simply the ones that never were relevant/accessible for modders.',
        frameNames: [],
    });
    meta.categoryInfo.push({
        name: 'Debug',
        description: '',
        frameNames: [],
    });

    const rules = [
        {
            match: /^(Alert|Alliance|Console|GameUI|InfoP|Minimap|Inventory|MenuBar|ObjectivePanel|PausePanel|PingPanel|GameMenu|GameButton|ExitDialog|ControlGroup|Command)/,
            category: 'GameUI related',
        },
        {
            match: /^(Abil|Behavior|Unit|CooldownFrame|Equipment)/,
            category: 'Units related',
        },
        {
            match: /^(Player)/,
            category: 'Players related',
        },
        {
            match: /^(BlurFrame|CinematicTextPanel|CountdownLabel|CutsceneFrame|Image|Label)/,
            category: 'Display',
        },
        {
            match: /(Tooltip)/,
            category: 'Display',
        },
        {
            match: /^(Button|EditBox|Pulldown|CheckBox)/,
            category: 'Control',
        },
        {
            match: /^(Board|CustomLoadingPanel|ArmyButton)/,
            category: 'Special',
        },
        {
            match: /^(Graph[A-Z])/,
            category: 'Graph',
        },
        {
            match: /^(Leader)/,
            category: 'LeaderPanel',
        },
        {
            match: /^(DataRefFrame|AspectRatioFrame|MathFrame|LookAtFrame|MovingFrame)/,
            category: 'Functional',
        },
        {
            match: /^(Achievement|AddFriend|Arcade|Battle|Party|Blocked|Bookmark|Browser|Buy|Campaign|Challenge|Chat|Club|Tropy|WarChest|UserProfile|voice|Invite|MenuPanel|System|Graphics|Commander|Coop|Credits|Screen|Offline|Matchmaking|CustomGame)/,
            category: 'BattleUI',
        },
        {
            match: /(Tournament|Social|Bundle|Pack|Skin|Lobby|Feed|Club|Emoticons|Glue|Toon)/,
            category: 'BattleUI',
        },
        {
            match: /^(ABChoiceFrame|FlashFrame)$/,
            category: 'Irrelevant',
        },
        {
            match: /(File)/,
            category: 'Irrelevant',
        },
        {
            match: /(Debug|PropertyListBox|FramePropertiesPanel|^Desc)/,
            category: 'Debug',
        },
    ];

    for (const frameName in schema.frames) {
        const frame = schema.frames[frameName];
        let category = 'Unclassified';

        switch (frame.category) {
            case 'sub_4933E0': category = 'Unclassified'; break;
            case 'ui_regStdElem2': category = 'Control'; break;
            case 'ui_regStdElem': category = 'Functional'; break;
        }

        for (const rule of rules) {
            if (frameName.match(rule.match)) {
                category = rule.category;
                break;
            }
        }

        meta.categoryMap[frameName] = category;
        if (!meta.frameCategoryMap[category]) meta.frameCategoryMap[category] = [];
        meta.frameCategoryMap[category].push(frameName);
        meta.categoryInfo.find((item) => item.name == category).frameNames.push(frameName);
    }

    return meta;
}

export function loadLayoutsIndex() {
    return <ls.LayoutsStoreComplete>{
        schema: <ls.LayoutsSchema>yaml.load(fs.readFileSync('_data/layouts.yml', 'utf8')),
        refs: <ls.RefStore>readJsonSync('_data/layouts-refs.json'),
        metadata: <ls.MetadataStore>readJsonSync('_data/layouts-meta.json'),
    };
}
