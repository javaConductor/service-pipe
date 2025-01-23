const jmespath = require("jmespath");

const misc = {
    interpolate: (stringValue, data) => {
        if (typeof stringValue !== 'string')
            return stringValue;
        const tFunc = (tpl, args) => (tpl || "").replace(/\${(\w+)}/g, (_, v) => args[v] || '');
        return tFunc(stringValue, data);
    },

    interpolateValue: (value, data) => {
        if (value.startsWith('object:')) {
            const valueName = value.substring(7);
            return (valueName.length === 0) ? value : jmespath.search(data, valueName);
        } else if (value.startsWith('array:')) {
            const valueName = value.substring(6);
            return (valueName.length === 0) ? value : jmespath.search(data, valueName);
        } else if (value.startsWith('string:')) {
            const valueName = value.substring(7);
            return (valueName.length === 0) ? value : jmespath.search(data, valueName);
        } else {
            return misc.interpolate(value, data);
        }
    },

    hasKeys: (obj) => {
        if (!obj)
            return false;
        return Object.keys(obj).length > 0;
    },

    /**
     * Removes null values from object
     * @param obj
     * @returns {*|{[p: string]: *}|{}}
     */
    clean(obj) {
        return Object.keys(obj).reduce((cleanObj, key) => (
            (obj[key]) ? {...cleanObj, [key]: obj[key]} : cleanObj
        ), {});
    }
}
module.exports = misc;
