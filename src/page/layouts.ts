import * as ls from '../layouts/types';
import { loadLayoutsIndex } from '../layouts/generator';
import { PageDefinition, slugify, PageCustom, PageDocDefinition } from './page';
import { PageRegistry } from '../context';
import { oentries } from '../util';

export class LayoutsRegistry implements ls.LayoutsStoreComplete {
    readonly rootRegistry: PageRegistry;
    schema: ls.LayoutsSchema;
    refs: ls.RefStore;
    metadata: ls.MetadataStore;
    pageMap = new Map<ls.ClassFieldDef | ls.Desc | ls.Class | ls.Frame | ls.FieldInfo, PageDefinition>();

    constructor(registry: PageRegistry) {
        this.rootRegistry = registry;
    }

    install() {
        Object.assign(this, loadLayoutsIndex());
        const layoutsPage = this.rootRegistry.registerPage(new PageCustom({
            title: 'Layouts',
            listChildren: true,
        }));

        // class kinds
        const pageClassFields = this.rootRegistry.addPage({
            title: 'Field kinds',
            slug: 'field-kind',
            listChildren: true,
            prepare: () => {
                return {};
            },
        }, layoutsPage);
        for (const fieldKind of oentries(this.schema.classFields)) {
            const page = this.rootRegistry.addDocPage(fieldKind, {
                template: 'layouts/field-kind-show.nj',
                prepare: this.prepareFieldKind.bind(this, fieldKind),
            }, pageClassFields);
            this.pageMap.set(fieldKind, page);
        }

        // class types
        const pageClassTypes = this.rootRegistry.addPage({
            title: 'Classes',
            slug: 'class',
            listChildren: true,
            prepare: () => {
                return {};
            },
        }, layoutsPage);
        for (const classType of oentries(this.schema.classes)) {
            const classTypePage = this.rootRegistry.addDocPage(classType, {
                template: 'layouts/class-type-show.nj',
                prepare: this.prepareClassType.bind(this, classType),
            }, pageClassTypes);
            this.pageMap.set(classType, classTypePage);
            for (const classField of oentries(classType.fields)) {
                this.pageMap.set(classField, this.rootRegistry.addDocPage(classField, {
                    template: 'layouts/class-field-show.nj',
                    prepare: this.prepareClassField.bind(this, classType, classField),
                }, classTypePage));
            }
        }
        for (const desc of oentries(this.schema.descs)) {
            const currentDescPage = this.rootRegistry.addDocPage(desc, {
                template: 'layouts/class-type-show.nj',
                prepare: this.prepareClassType.bind(this, desc),
            }, pageClassTypes);
            this.pageMap.set(desc, currentDescPage);
            for (const classField of oentries(desc.fields)) {
                this.pageMap.set(classField, this.rootRegistry.addDocPage(classField, {
                    template: 'layouts/class-field-show.nj',
                    prepare: this.prepareClassField.bind(this, desc, classField),
                }, currentDescPage));
            }
        }

        // frames
        const pageFrames = this.rootRegistry.addPage({
            title: 'Frames',
            slug: 'frame',
            template: 'layouts/frame-list.nj',
            prepare: this.prepareFrameList.bind(this),
        }, layoutsPage);
        for (const frame of oentries(this.schema.frames)) {
            this.pageMap.set(frame, this.rootRegistry.addDocPage(frame, {
                template: 'layouts/frame-show.nj',
                prepare: this.prepareFrame.bind(this, frame),
            }, pageFrames));
        }
    }

    prepareFieldKind(fieldKind: ls.ClassFieldDef) {
        const usage: { classType: ls.Class, fieldName: string, page: PageDefinition, fieldPage: PageDefinition }[] = [];
        for (const classType of oentries(this.schema.classes)) {
            for (const classField of oentries(classType.fields)) {
                if (classField.fieldKind !== fieldKind.name) continue;
                usage.push({
                    classType: classType,
                    fieldName: classField.name,
                    page: this.pageMap.get(classType),
                    fieldPage: this.pageMap.get(classField),
                });
            }
        }

        return {
            fieldKind: fieldKind,
            usage: usage,
        };
    }

    prepareClassType(classType: ls.Class | ls.Desc) {
        const isDesc = classType.name.match(/desc$/i);
        const classList: PageDocDefinition<ls.Class | ls.Desc>[] = [];
        const framesList: PageDocDefinition<ls.Frame>[] = [];
        const extendedByList: PageDocDefinition<ls.Class>[] = [];
        const fields: {
            fieldPage: PageDocDefinition<ls.FieldInfo>,
            fieldKindPage: PageDocDefinition<ls.ClassFieldDef>,
            fieldMeta: ls.FieldMeta,
        }[] = [];

        for (const name of classType.inheritanceList) {
            const ditem = this.schema.classes[name] || this.schema.descs[name];
            if (!this.pageMap.has(ditem)) continue;
            classList.push(<any>this.pageMap.get(ditem));
        }

        for (const frame of oentries(this.schema.frames)) {
            if (classType.name !== frame.classType && classType.name !== frame.desc) continue;
            framesList.push(<any>this.pageMap.get(frame));
        }

        for (const itemClassType of oentries(Object.assign({}, this.schema.classes, this.schema.descs))) {
            if (classType.inheritanceList >= itemClassType.inheritanceList) continue;
            if (itemClassType.inheritanceList[classType.inheritanceList.length] !== classType.name) continue;
            extendedByList.push(<any>this.pageMap.get(itemClassType));
        }

        for (const field of oentries(classType.fields)) {
            fields.push({
                fieldPage: <any>this.pageMap.get(field),
                fieldKindPage: field.fieldKind ? <any>this.pageMap.get(this.schema.classFields[field.fieldKind]) : null,
                fieldMeta: this.metadata.classMeta[classType.name].fields[field.name],
            });
        }

        return {
            isDesc: isDesc,
            classType: classType,
            classList: classList,
            framesList: framesList,
            extendedByList: extendedByList,
            fields: fields,
        };
    }

    prepareClassField(classType: ls.Class | ls.Desc, classField: ls.FieldInfo) {
        const framesList: PageDocDefinition<ls.Frame>[] = [];
        const isDesc = classType.name.match(/desc$/i);
        let fieldKind: PageDocDefinition<ls.FieldInfo>;

        if (!isDesc) {
            fieldKind = <PageDocDefinition<ls.FieldInfo>>this.pageMap.get(this.schema.classFields[classField.fieldKind]);
        }

        for (const frame of oentries(this.schema.frames)) {
            for (const className of this.schema.classes[frame.classType].inheritanceList) {
                const ctype = this.schema.classes[className];
                if (!ctype || !ctype.fields) continue;
                if (!ctype.fields[classField.name]) continue;
                framesList.push(<any>this.pageMap.get(frame));
            }
            // if (classType.name !== frame.classType && classType.name !== frame.desc) continue;
        }

        return {
            classType: classType,
            isDesc: isDesc,
            classField: classField,
            fieldKind: fieldKind,
            fieldMeta: this.metadata.classMeta[classType.name].fields[classField.name],
            framesList: framesList,
            fieldOccurrences: this.refs.fieldOccurences[classField.name],
        };
    }

    prepareFrameList() {
        return {
            lstore: <ls.LayoutsStoreComplete>this,
        };
    }

    prepareFrame(frame: ls.Frame) {
        const typeClass = this.schema.classes[frame.classType];
        const classList: any[] = [];

        for (const className of this.schema.descs[frame.desc].inheritanceList) {
            if (!this.schema.descs[className]) continue;
            classList.push(<any>this.prepareClassType(this.schema.descs[className]));
        }
        for (const className of this.schema.classes[frame.classType].inheritanceList) {
            classList.push(<any>this.prepareClassType(this.schema.classes[className]));
        }

        return {
            rl: <ls.LayoutsStoreComplete>this,
            frame: frame,
            classList: classList,
            occurrences: this.refs.frameOccurences[frame.name],
            cls: this.prepareClassType(typeClass),
            dsc: this.prepareClassType(this.schema.descs[frame.desc]),
        };
    }
}

