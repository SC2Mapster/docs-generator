import { PageRegistry } from '../context';
import { PageCustom } from './page';
import * as sch from '../../layout-tools/src/schema/base';
import { generateSchema } from '../../layout-tools/src/schema/map';

interface LayoutBuildContext {
    schema: sch.SchemaRegistry;
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
        setupBasicTypes,
        setupFrameClasses,
        setupFrameTypes,
        setupAnimations,
        setupStateGroups,
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

function setupBasicTypes(lCtx: LayoutBuildContext) {
    const pageTypeList = lCtx.pageRegistry.addPage({
        title: 'Basic types',
        slug: 'type',
        listChildren: true,
    }, lCtx.rootSection);

    const pageElementsList = lCtx.pageRegistry.addPage({
        title: 'Element definitions',
        slug: 'element',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sType of lCtx.schema.stypes.values()) {
        if ((sType.flags & sch.CommonTypeFlags.Virtual)) continue;

        if (sType.smKind === sch.SModelKind.SimpleType) {
            lCtx.pageRegistry.addDocPage(sType, {
                template: 'layout/simple-type/show.nj',
                prepare: prepareSimpleType.bind(null, <sch.SimpleType>sType),
            }, pageTypeList);
        }
        else if (sType.smKind === sch.SModelKind.ComplexType) {
            lCtx.pageRegistry.addDocPage(sType, {
                template: 'layout/complex-type/show.nj',
                prepare: prepareComplexType.bind(null, <sch.ComplexType>sType),
            }, pageElementsList);
        }
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

function setupFrameClasses(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Frame classes',
        slug: 'frame-class',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sFrameClass of lCtx.schema.frameClasses.values()) {
        lCtx.pageRegistry.addDocPage(sFrameClass, {
            template: 'layout/frame-class/show.nj',
            prepare: prepareFrameClass.bind(null, sFrameClass),
        }, pList);
    }
}

// ====================
// - Frame types
// ====================

function prepareFrame(sFrameType: sch.FrameType) {
    return {
        frame: sFrameType,
    };
}

function setupFrameTypes(lCtx: LayoutBuildContext) {
    const pList = lCtx.pageRegistry.addPage({
        title: 'Frame types',
        slug: 'frame-type',
        listChildren: true,
    }, lCtx.rootSection);

    for (const sFrame of lCtx.schema.frameTypes.values()) {
        lCtx.pageRegistry.addDocPage(sFrame, {
            template: 'layout/frame-type/show.nj',
            prepare: prepareFrame.bind(null, sFrame),
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
