export function buildMap<T>(obj: T) {
    return Object.keys(obj).reduce((map, key) => map.set(key, (<any>obj)[key]), new Map<string, T>());
}

export function* oentries<T>(obj: T) {
    for (const key in obj) {
        yield obj[key];
    }
}
