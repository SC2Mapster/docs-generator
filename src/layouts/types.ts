export type DataType = {
    name: string;
    size: number;
};

export type Field = {
    name: string;
    attributes: {
        name: string;
        type: string;
    }[];
};

export type Desc = {
    name: string;
    fields: {
        name: string;
    }[];
};

export type ClassField = {
    name: string;
    type: string;
    constant: boolean;
    defaultValue: string;
};

export type Class = {
    name: string;
    inheritanceList: string[];
    fields: ClassField[];
};

export type Frame = {
    name: string;
    blizzOnly: boolean;
    classType: string;
    descType: string;
    category: string;
};

export type LayoutsSchema = {
    types: {
        [name: string]: DataType;
    };
    fields: {
        [name: string]: Field;
    };
    descs: {
        [name: string]: Desc;
    };
    classes: {
        [name: string]: Class;
    };
    frames: {
        [name: string]: Frame;
    };
};

//

export type RefOccurence = {
    modName: string;
    filename: string;
    sourceUrl: string;
    lineStart: number;
    posStart: number;
};

export type ElementOccurence = RefOccurence & {
    frameType: string;
    attributes: { [key: string]: string };
};

export type FrameOccurence = RefOccurence & {
};

export type RefStore = {
    frameOccurences: { [frameName: string]: FrameOccurence[]; };
    fieldOccurences: { [fieldName: string]: ElementOccurence[]; };
};

export type FrameCategoryInfo = {
    name: string
    description?: string;
    frameNames: string[];
};

export type FieldMetaAttr = {
    type: string;
    required: boolean;
};

export type FieldMeta = {
    attrs: { [attrName: string]: FieldMetaAttr; }
};

export type ClassMeta = {
    fields: { [fieldName: string]: FieldMeta; }
};

export type MetadataStore = {
    categoryInfo: FrameCategoryInfo[];
    categoryMap: { [categoryName: string]: string; };
    frameCategoryMap: { [frameName: string]: string[]; };
    classMeta: { [className: string]: ClassMeta; };
};

export interface LayoutsStoreComplete {
    schema: LayoutsSchema;
    refs: RefStore;
    metadata: MetadataStore;
};

export class LayoutsManager implements LayoutsStoreComplete {
    schema: LayoutsSchema;
    refs: RefStore;
    metadata: MetadataStore;

    // public get categorizedFrames() {
    //     const categoryFrameMap = new Map<string, Frame[]>();
    //     for (const name in this.metadata.categoryMap) {
    //         const categoryName = this.metadata.categoryMap[name];
    //         if (!categoryFrameMap.has(categoryName)) categoryFrameMap.set(categoryName, []);
    //         categoryFrameMap.get(categoryName).push(this.schema.frames[name]);
    //     }
    //     console.log(categoryFrameMap);

    //     return categoryFrameMap;
    // }
};
