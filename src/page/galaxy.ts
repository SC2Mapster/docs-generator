import { GalaxyStore, DSourceEntry } from '../generator';
import { PageDefinition, slugify } from "./page";

export class GalaxyApiEntry extends PageDefinition {
    params: {
        dentry: DSourceEntry,
    };

    constructor(entry: DSourceEntry) {
        super();
        this.params = {
            dentry: entry,
        };
    }

    get title() {
        return this.params.dentry.name;
    }

    public get slug() {
        return slugify(this.params.dentry.id);
    }
}
