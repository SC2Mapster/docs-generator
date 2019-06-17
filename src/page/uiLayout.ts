import { PageRegistry } from '../context';
import { PageCustom } from './page';
import * as sch from '../../ext/sc2-layout/src/schema/base';
import { generateSchema, SchemaRegistryBrowser } from '../../ext/sc2-layout/src/schema/registry';

interface LayoutBuildContext {
    schema: SchemaRegistryBrowser;
    pageRegistry: PageRegistry;
    rootSection: PageCustom;
}

export function populateLayoutPages(pageRegistry: PageRegistry) {
    const rootSection = pageRegistry.registerPage(new PageCustom({
        title: 'UI Layout',
        listChildren: true,
    }));

    const lCtx = <LayoutBuildContext>{
        schema: generateSchema('layout-schema/sc2layout'),
        pageRegistry: pageRegistry,
        rootSection: rootSection,
    };

    const setupList = [
        setupSimpleTypes,
        setupComplexTypes,
        // setupElementDefinitions,
        setupFrameClasses,
        setupFrameTypes,
        // setupAnimations,
        // setupStateGroups,
    ];
    for (const fnSetup of setupList) {
        fnSetup.call(void 0, lCtx);
    }
}

// ====================
// - Types
// ====================

function prepareSimpleType(sSimpleType: sch.SimpleType) {
    return {
        simpleType: sSimpleType,
        simpleTypeKind: sch.SimpleTypeKind[sSimpleType.kind],
        nativeDataType: sch.SimpleTypeData[sSimpleType.data],
    };
}

function setupSimpleTypes(lCtx: LayoutBuildContext) {
    const pageBasicTypeList = lCtx.pageRegistry.addPage({
        title: 'Basic types',
        slug: 'type',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sType of lCtx.schema.catalog.simpleType.values()) {
        if ((sType.flags & sch.CommonTypeFlags.Virtual)) continue;

        lCtx.pageRegistry.addDocPage(sType, {
            template: 'layout/simple-type/show.nj',
            prepare: prepareSimpleType.bind(null, sType),
        }, pageBasicTypeList);
    }
}

// ====================
// - Complex types
// ====================

function prepareComplexType(sComplexType: sch.ComplexType) {
    const complexTypeFlags: string[] = [];
    for (const flagName in (<any>sch).ComplexTypeFlags) {
        if (/^\d+$/.test(flagName)) continue;
        const flagMask: sch.ComplexTypeFlags = (<any>sch).ComplexTypeFlags[flagName];
        if (sComplexType.flags & flagMask) {
            complexTypeFlags.push(flagName);
        }
    }

    return {
        complexType: sComplexType,
        complexTypeFlags,
    }
};

function setupComplexTypes(lCtx: LayoutBuildContext) {
    const pageComplexTypesList = lCtx.pageRegistry.addPage({
        title: 'Complex types',
        slug: 'complex-type',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sType of lCtx.schema.catalog.complexType.values()) {
        if ((sType.flags & sch.CommonTypeFlags.Virtual)) continue;
        lCtx.pageRegistry.addDocPage(sType, {
            template: 'layout/complex-type/show.nj',
            prepare: prepareComplexType.bind(null, sType),
        }, pageComplexTypesList);
    }
}

// ====================
// - Element definitions
// ====================

function prepareElementDefinition(sElementDef: sch.ElementDef) {
    return {
        elementDef: sElementDef,
    }
};

function setupElementDefinitions(lCtx: LayoutBuildContext) {
    const pageElementsList = lCtx.pageRegistry.addPage({
        title: 'Element definitions',
        slug: 'element',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sType of lCtx.schema.catalog.element.values()) {
        lCtx.pageRegistry.addDocPage(sType, {
            template: 'layout/element-def/show.nj',
            prepare: prepareElementDefinition.bind(null, sType),
        }, pageElementsList);
    }
}

// ====================
// - Frame classes
// ====================

function prepareFrameClass(sFrameClass: sch.FrameClass) {
    return {
        frameClass: sFrameClass,
    };
}

function prepareFrameProperty(sFrameProperty: sch.FrameProperty) {
    return {
        frameProperty: sFrameProperty,
    };
}

function setupFrameClasses(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Frame classes',
        slug: 'frame-class',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sFrameClass of lCtx.schema.catalog.frameClass.values()) {
        const pageClass = lCtx.pageRegistry.addDocPage(sFrameClass, {
            template: 'layout/frame-class/show.nj',
            prepare: prepareFrameClass.bind(null, sFrameClass),
        }, pList);

        for (const sFrameProperty of sFrameClass.properties.values()) {
            lCtx.pageRegistry.addDocPage(sFrameProperty, {
                template: 'layout/frame-property/show.nj',
                prepare: prepareFrameProperty.bind(null, sFrameProperty),
            }, pageClass);
        }
    }
}

// ====================
// - Frame types
// ====================

function prepareListFrame(schema: SchemaRegistryBrowser) {
    return {
        frameList: Array.from(schema.catalog.frameType.values()),
    };
}

function prepareFrame(sFrameType: sch.FrameType) {
    const frameDescs: sch.ComplexType[] = [];

    function applyDesc(currDesc: sch.ComplexType) {
        frameDescs.push(currDesc);
        for (const tmpcType of currDesc.inheritance.from.values()) {
            applyDesc(tmpcType);
        }
    }

    if (sFrameType.customDesc) {
        applyDesc(sFrameType.customDesc);
    }

    return {
        frame: sFrameType,
        frameDescs: frameDescs,
    };
}

function setupFrameTypes(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Frame types',
        slug: 'frame-type',
        template: 'layout/frame-type/list.nj',
        prepare: prepareListFrame.bind(null, lCtx.schema),
    }, lCtx.rootSection);

    for (const sFrame of lCtx.schema.frameTypes.values()) {
        lCtx.pageRegistry.addDocPage(sFrame, {
            template: 'layout/frame-type/show.nj',
            prepare: prepareFrame.bind(null, sFrame, lCtx.schema),
        }, pList);
    }
}

// ====================
// - Animations
// ====================

function setupAnimations(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Animations',
        slug: 'animation',
        listChildren: true,
    }, lCtx.rootSection);
}

// ====================
// - State groups
// ====================

function setupStateGroups(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Stategroups',
        slug: 'stategroup',
        listChildren: true,
    }, lCtx.rootSection);
}
