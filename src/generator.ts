import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as yaml from 'js-yaml';

import * as gt from '../node_modules/plaxtony/lib/compiler/types';
import { Printer } from '../node_modules/plaxtony/lib/compiler/printer';
import { Store, createTextDocumentFromFs, S2WorkspaceWatcher } from '../node_modules/plaxtony/lib/service/store';
import { SC2Workspace, SC2Archive, resolveArchiveDirectory, findSC2ArchiveDirectories } from '../node_modules/plaxtony/lib/sc2mod/archive';
import * as trig from '../node_modules/plaxtony/lib/sc2mod/trigger';
import * as loc from '../node_modules/plaxtony/lib/sc2mod/localization';
import { forEachChild } from 'plaxtony/lib/compiler/utils';
import { getLineAndCharacterOfPosition } from 'plaxtony/lib/service/utils';

const modsBaseDir = path.resolve('_repo/sc2-data-trigger-master');

export enum DKind {
    Library = 'Library',
    Category = 'Category',
    Function = 'Function',
    FunctionParameter = 'FunctionParameter',
    Preset = 'Preset',
    PresetValue = 'PresetValue',
};

export type DEntry = {
    kind: DKind;
    name: string;
    symbolName?: string;
};

export type DSourceEntry = DEntry & {
    id: string;
    sourceUrl: string;
    categories: string[];
    rootCategory: string;
};

export type DCategory = DEntry & {
    label?: string;
    // items: DSourceEntry;
};

export type DFunctionParameter = DEntry & {
    name?: string;
    type: string;
    galaxyType: string;
    preset?: string;
    gameLink?: string;
};

export enum DFunctionFlags {
    Native = 'Native',
    Operator = 'Operator',
    SubFunctions = 'SubFunctions',
    CustomScript = 'CustomScript',
    Function = 'Function',
    Action = 'Action',
    Deprecated = 'Deprecated',
    CustomAI = 'CustomAI',
    Event = 'Event',
    Hidden = 'Hidden',
    Internal = 'Internal',
};

export type DFunction = DSourceEntry & {
    grammar?: string;
    hint?: string;
    rawCode?: string;
    flags: DFunctionFlags[];
    parameters: DFunctionParameter[];
    returnType?: DFunctionParameter;
};

export type DPresetValue = DEntry & {
    name: string;
    rawName?: string;
    rawCode?: string;
};

export type DPreset = DSourceEntry & {
    presets: DPresetValue[];
    baseType: string;
};

//

export type DCategoryList = {
    fullname: string;
    name: string;
    categories: DCategoryList[];
};

export type DListingLibrary = DCategoryList & {
};

export type GalaxyStore = {
    listing: DListingLibrary;
    entries: {
        [name: string]: DSourceEntry;
    },
    categoryEntryMap: {
        [name: string]: string[];
    },
    usageTable: {
        [name: string]: {
            modName: string;
            sourceLink: string;
            sourceLine: string;
        }[]
    },
};

async function mockupStoreFromS2Workspace(directory: string, modSources: string[]) {
    const store = new Store();
    const ws = new S2WorkspaceWatcher(directory, modSources);
    const workspaces: SC2Workspace[] = [];
    ws.onDidOpen((ev) => {
        store.updateDocument(ev.document);
    });
    ws.onDidOpenS2Archive((ev) => {
        workspaces.push(ev.workspace);
    });
    await ws.watch();
    for (const ws of workspaces) {
        await store.updateS2Workspace(ws, 'enUS');
    }
    return store;
}

export async function generateGalaxyReference() {
    const printer = new Printer();
    const store = await mockupStoreFromS2Workspace('mods/core.sc2mod', [modsBaseDir]);
    const tlang = store.s2workspace.locComponent.triggers;

    function enumerateCategories(categoryChain: string[]) {
        const normalized: string[] = [];
        for (const c of categoryChain) {
            normalized.push((normalized.length ? normalized[normalized.length - 1] + ' / ' : '') + c);
        }
        return normalized;
    }

    function docifyElement(el: trig.Element) {
        const docEntry = <DSourceEntry>{};

        docEntry.id = el.name;
        docEntry.name = tlang.elementName('Name', el);

        switch (el.constructor) {
            case trig.FunctionDef:
            {
                if (el.flags & trig.ElementFlag.Template) {
                    docEntry.id = null;
                    break;
                }
                const docFunc = <DFunction>docEntry;
                docFunc.kind = DKind.Function;
                docFunc.grammar = tlang.elementName('Grammar', el) || null;
                docFunc.hint = tlang.elementName('Hint', el) || null;

                const sym = store.resolveGlobalSymbol(store.s2metadata.getElementSymbolName(el));
                if (sym) {
                    docFunc.id = sym.escapedName;
                    docFunc.symbolName = sym.escapedName;

                    const decl = Object.assign({}, sym.declarations[0]);
                    if (decl.kind === gt.SyntaxKind.FunctionDeclaration) {
                        (<gt.FunctionDeclaration>decl).body = null;
                        const isNative = (<gt.FunctionDeclaration>decl).modifiers.findIndex((item) =>
                            item.kind === gt.SyntaxKind.NativeKeyword
                        ) !== -1;
                        if (isNative && el.flags & trig.ElementFlag.Deprecated) {
                            docFunc.id += 'Deprecated';
                        }
                    }
                    docFunc.rawCode = printer.printNode(decl).trim();
                }
                else {
                    docEntry.id = store.s2metadata.getElementSymbolName(el);
                    if ((<trig.FunctionDef>el).scriptCode) {
                        docFunc.rawCode = (<trig.FunctionDef>el).scriptCode;
                    }
                }

                docFunc.parameters = [];
                for (const item of (<trig.FunctionDef>el).getParameters()) {
                    docFunc.parameters.push({
                        kind: DKind.FunctionParameter,
                        // rawName: null,
                        name: tlang.elementName('Name', item),
                        type: item.type.type,
                        galaxyType: item.type.galaxyType(),
                        gameLink: item.type.gameType || null,
                        preset: item.type.typeElement ? 'Preset' + item.type.typeElement.resolve().name : null,
                    });
                }

                if ((<trig.FunctionDef>el).returnType) {
                    const rtype = (<trig.FunctionDef>el).returnType;
                    docFunc.returnType = {
                        kind: DKind.FunctionParameter,
                        name: '',
                        type: rtype.type,
                        galaxyType: rtype.galaxyType(),
                        gameLink: rtype.gameType || null,
                        preset: rtype.typeElement ? 'Preset' + rtype.typeElement.resolve().name : null,
                    };
                }

                docFunc.flags = [];
                if (el.flags & trig.ElementFlag.Native) docFunc.flags.push(DFunctionFlags.Native);
                if (el.flags & trig.ElementFlag.Operator) docFunc.flags.push(DFunctionFlags.Operator);
                if (el.flags & trig.ElementFlag.SubFunctions) docFunc.flags.push(DFunctionFlags.SubFunctions);
                if (el.flags & trig.ElementFlag.CustomScript) docFunc.flags.push(DFunctionFlags.CustomScript);
                if (el.flags & trig.ElementFlag.FuncCall) docFunc.flags.push(DFunctionFlags.Function);
                if (el.flags & trig.ElementFlag.FuncAction) docFunc.flags.push(DFunctionFlags.Action);
                if (el.flags & trig.ElementFlag.Deprecated) docFunc.flags.push(DFunctionFlags.Deprecated);
                if (el.flags & trig.ElementFlag.CustomAI) docFunc.flags.push(DFunctionFlags.CustomAI);
                if (el.flags & trig.ElementFlag.Event) docFunc.flags.push(DFunctionFlags.Event);
                if (el.flags & trig.ElementFlag.Hidden) docFunc.flags.push(DFunctionFlags.Hidden);
                if (el.flags & trig.ElementFlag.Internal) docFunc.flags.push(DFunctionFlags.Internal);

                break;
            }
            case trig.Preset:
            {
                const docPreset = <DPreset>docEntry;
                docPreset.kind = DKind.Preset;
                docPreset.name = tlang.elementName('Name', el);
                docPreset.presets = [];

                const preset = <trig.Preset>el;
                docPreset.baseType = preset.baseType;
                docPreset.id = 'Preset' + (preset.name || docPreset.name);
                // docPreset.id = store.s2metadata.getElementSymbolName(preset);

                if (preset.flags & trig.ElementFlag.PresetGenConstVar) {
                    for (const link of preset.values) {
                        const presetValue = link.resolve();

                        const dpValue = <DPresetValue>{
                            kind: DKind.PresetValue,
                        };
                        dpValue.name = tlang.elementName('Name', presetValue);

                        if (preset.flags & trig.ElementFlag.PresetCustom) {
                            if (presetValue.value.match(/[a-zA-Z]+/g)) {
                                dpValue.rawName = presetValue.value;
                            }
                        }
                        else {
                            dpValue.rawName = store.s2metadata.getElementSymbolName(preset) + '_' + presetValue.name;
                        }

                        if (dpValue.rawName) {
                            const sym = store.resolveGlobalSymbol(dpValue.rawName);
                            if (sym) {
                                dpValue.rawCode = printer.printNode(sym.declarations[0]).trim();
                            }
                        }

                        docPreset.presets.push(dpValue);
                    }
                }
                else if (preset.baseType === 'bool') {
                }

                break;
            }
        }

        return docEntry;
    }

    const categories: string[] = [];
    const labels: trig.Label[] = [];
    const galStore = <GalaxyStore>{
        entries: {},
        categoryEntryMap: {},
        listing: {
            name: 'Ntve',
            categories: [],
        },
        usageTable: {},
    };

    function registerDocEntry(docEntry: DSourceEntry) {
        if (galStore.entries[docEntry.id]) throw Error(`${docEntry.id} key already taken`);
        galStore.entries[docEntry.id] = docEntry;
        if (!galStore.categoryEntryMap[docEntry.rootCategory]) galStore.categoryEntryMap[docEntry.rootCategory] = [];
        galStore.categoryEntryMap[docEntry.rootCategory].push(docEntry.id);
    }

    function traverseElement(el: trig.Element, listing: DCategoryList) {
        if (el.label) labels.push(el.label.resolve());
        const parentListing = listing;
        if (el instanceof trig.Category) {
            categories.push(tlang.elementName('Name', el));
            listing = {
                fullname: enumerateCategories(categories)[enumerateCategories(categories).length - 1],
                name: tlang.elementName('Name', el),
                categories: [],
            };
        }
        let traverse = false;

        switch (el.constructor) {
            case trig.FunctionDef:
            case trig.Preset:
            {
                const docEntry = docifyElement(el);
                docEntry.categories = enumerateCategories(categories);
                docEntry.rootCategory = docEntry.categories[docEntry.categories.length - 1];
                if (docEntry.id) {
                    registerDocEntry(docEntry);
                }
                break;
            }
            default:
            {
                traverse = true;
                break;
            }
        }

        if (traverse) {
            for (const item of el.items) {
                traverseElement(item.resolve(), listing);
            }
        }

        if (el instanceof trig.Category) {
            categories.pop();
            parentListing.categories.push(listing);
        }
        if (el.label) labels.pop();
    }

    function docEntryFromFunction(decl: gt.FunctionDeclaration) {
        const docEntry = <DFunction>{};
        docEntry.id = decl.name.name;
        docEntry.name = decl.name.name;
        docEntry.kind = DKind.Function;
        docEntry.flags = [DFunctionFlags.Native];
        const tmpDecl = Object.assign({}, decl);
        tmpDecl.body = null;
        docEntry.rawCode = printer.printNode(tmpDecl).trim();
        docEntry.parameters = [];
        for (const p of decl.parameters) {
            docEntry.parameters.push({
                kind: DKind.FunctionParameter,
                name: p.name.name,
                type: printer.printNode(p.type),
                galaxyType: printer.printNode(p.type),
            });
        }
        docEntry.returnType = {
            name: null,
            kind: DKind.FunctionParameter,
            type: printer.printNode(tmpDecl.type),
            galaxyType: printer.printNode(tmpDecl.type),
        };
        docEntry.rootCategory = 'Unclassified';
        docEntry.categories = ['Unclassified'];
        return docEntry;
    }

    //
    traverseElement(
        <any>store.s2workspace.trigComponent.getStore().getLibraries().get('Ntve'),
        galStore.listing
    );

    //
    galStore.listing.categories.push({
        name: 'Unclassified',
        fullname: 'Unclassified',
        categories: [],
    });
    for (const sourceFile of store.documents.values()) {
        for (const symbol of sourceFile.symbol.members.values()) {
            if (symbol.declarations[0].kind === gt.SyntaxKind.FunctionDeclaration) {
                const fnDecl = <gt.FunctionDeclaration>symbol.declarations[0];
                const isNative = fnDecl.modifiers.findIndex((item) => {
                    return item.kind === gt.SyntaxKind.NativeKeyword;
                }) !== -1;

                if (!isNative) continue;
                const el = store.s2metadata.findElementByName(symbol.escapedName);
                // if (docStore.has(symbol.escapedName)) continue;
                if (el) continue;
                registerDocEntry(docEntryFromFunction(fnDecl))
            }
        }
    }

    return galStore;
};

//

export type GalaxyModUsage = {
    name: string;
    sourceLink: string;
};

export async function generateGalaxyUsage(gstore: GalaxyStore) {
    const srcList = await findSC2ArchiveDirectories(modsBaseDir);
    const modPathOffset = 'file://'.length + modsBaseDir.length + 1;
    const repoPrefix = 'https://github.com/Talv/sc2-data-trigger/blob/v4.2.0/';
    for (const src of srcList) {
        // console.log(`processing: ${src}`);
        // if (src.indexOf('alliedcommanders.sc2mod') === -1) continue;
        const store = await mockupStoreFromS2Workspace(src, [modsBaseDir]);
        store.rootPath = src;
        const modName = store.s2workspace.rootArchive.name;
        console.log(modName);

        function retrieveSourceLine(sourceFile: gt.SourceFile, node: gt.Node) {
            let code = sourceFile.text.substr(node.pos, node.end - node.pos);
            const whitespace = code.match(/\n(\s+)\)$/);
            if (whitespace) {
                code = code.trim().replace(new RegExp('^' + whitespace[1], 'gm'), '');
            }
            return code;
        }

        function collectReferences(sourceFile: gt.SourceFile, child: gt.Node) {
            if (
                child.kind === gt.SyntaxKind.Identifier &&
                child.parent.kind === gt.SyntaxKind.CallExpression &&
                (<gt.CallExpression>child.parent).expression === child
            ) {
                let indName = (<gt.Identifier>child).name;
                // const sym = store.resolveGlobalSymbol(indName);
                // if (sym) {
                //     const decl = <gt.FunctionDeclaration>sym.declarations[0];
                //     if (decl.kind === gt.SyntaxKind.FunctionDeclaration) {
                //         const el = store.s2metadata.findElementByName(indName);
                //         if (el) {
                //             indName = el.id;
                //         }
                //     }
                // }
                if (gstore.entries[indName]) {
                    const childLine = getLineAndCharacterOfPosition(sourceFile, child.pos).line + 1;
                    if (!gstore.usageTable[indName]) gstore.usageTable[indName] = [];
                    // limit to 50 entries for the time being..
                    if (gstore.usageTable[indName].length < 50) {
                        gstore.usageTable[indName].push({
                            modName: modName,
                            sourceLink: repoPrefix + sourceFile.fileName.substr(modPathOffset) + '#L' + childLine,
                            sourceLine: retrieveSourceLine(sourceFile, child.parent),
                        });
                    }
                }
            }
            forEachChild(child, (node: gt.Node) => {
                collectReferences(sourceFile, node);
            });
        }

        // for (const sourceFile of store.documents.values()) {
        for (const sourceFile of store.documents.values()) {
            if (!store.isDocumentInWorkspace(sourceFile.fileName, false)) continue;
            console.log(`filename: ${sourceFile.fileName}`);
            collectReferences(sourceFile, sourceFile);
        }

        // for (const name in gstore.entries) {
        //     const entry = gstore.entries[name];
        //     if (entry.kind !== DKind.Function) continue;
        //     const sym = store.resolveGlobalSymbol(name);
        //     if (!sym) continue;
        // }
    }
};
