/** Map snake_case API docs to camelCase for web PocketBase-compat layer */
export const toCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const OMIT_FIELDS = new Set(["file_data", "password_hash", "__v", "_id"]);
export const serializeDoc = (doc) => {
    const out = {};
    for (const [k, v] of Object.entries(doc)) {
        if (OMIT_FIELDS.has(k))
            continue;
        const camel = toCamel(k);
        if (v instanceof Date) {
            out[camel] = v.toISOString();
        }
        else if (Buffer.isBuffer(v)) {
            continue;
        }
        else {
            out[camel] = v;
        }
    }
    return out;
};
export const listResponse = (items, total) => ({
    items: Array.isArray(items) ? items.map((i) => (typeof i === "object" && i !== null ? serializeDoc(i) : i)) : items,
    totalItems: total ?? (Array.isArray(items) ? items.length : 0),
    total: total ?? (Array.isArray(items) ? items.length : 0)
});
