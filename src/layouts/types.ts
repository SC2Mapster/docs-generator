export type DataType = {
    name: string;
    size: number;
};

export type ClassFieldDef = {
    name: string;
    attributes: {
        [name: string]: {
            name: string;
            required: boolean;
        };
    };
    enumValues?: string[];
};

export type Desc = {
    name: string;
    inheritanceList: string[];
    fields: { [fieldName: string]: FieldInfo };
};

export type FieldInfo = {
    name: string;
    fieldKind: string;
    type: string;
    constant: boolean;
    defaultValue: string;
    flags?: string[];
};

export type Class = {
    name: string;
    inheritanceList: string[];
    fields: { [fieldName: string]: FieldInfo };
};

export type Frame = {
    name: string;
    blizzOnly: boolean;
    classType: string;
    desc: string;
    category: string;
};

export type LayoutsSchema = {
    types: {
        [name: string]: DataType;
    };
    classFields: {
        [name: string]: ClassFieldDef;
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

// ---
// ---

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

// ---
// ---

export type FrameCategoryInfo = {
    name: string
    description?: string;
    frameNames: string[];
};

export type FieldMetaAttr = {
    type: string;
    required: boolean;
    occurrenceCount: number;
    values: string[];
};

export type FieldMeta = {
    occurrenceCount: number;
    attrs: { [attrName: string]: FieldMetaAttr; }
};

export type ClassMeta = {
    fields: { [fieldName: string]: FieldMeta; }
};

export type DescMeta = {
    fields: { [fieldName: string]: FieldMeta; }
};

export type MetadataStore = {
    categoryInfo: FrameCategoryInfo[];
    categoryMap: { [categoryName: string]: string; };
    frameCategoryMap: { [frameName: string]: string[]; };
    classMeta: { [className: string]: ClassMeta; };
    descMeta: { [descName: string]: DescMeta; };
};

export interface LayoutsStoreComplete {
    schema: LayoutsSchema;
    refs: RefStore;
    metadata: MetadataStore;
};

