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
    readonly: boolean;
};

export type Class = {
    name: string;
    inherits: string[];
    fields: ClassField[];
};

export type Frame = {
    name: string;
    blizzOnly: boolean;
    class: string;
    desc: string;
};

export type LayoutsStore = {
    type: {
        [name: string]: DataType;
    };
    field: {
        [name: string]: Field;
    };
    desc: {
        [name: string]: Desc;
    };
    class: {
        [name: string]: Class;
    };
    frame: {
        [name: string]: Frame;
    };
};
