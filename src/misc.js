const jmespath = require("jmespath");

const misc =  {
    interpolate: (stringValue, data) => {
        if(typeof stringValue !== 'string')
            return stringValue;
        const tFunc = (tpl, args) => (tpl||"").replace(/\${(\w+)}/g, (_, v) => args[v] || '');
        return tFunc(stringValue, data);
    },

    interpolateObject: (obj, realData) => {
        return Object.keys(obj).reduce((result, key) => {
            const value = (typeof obj[key] === "string")
                ? misc.interpolateValue(obj[key], realData)
                : obj[key];
            return {...result, [key]: value}
        }, {});
    },

    interpolateValue: (value, data) => {
        if (value.startsWith('object:')) {
            const valueName = value.substr(7);
            return (valueName.length  === 0) ? value : jmespath.search(data, valueName);
        } else if (value.startsWith('array:')) {
            const valueName = value.substr(6);
            return (valueName.length  === 0) ? value : jmespath.search(data, valueName);
        } else if (value.startsWith('string:')) {
            const valueName = value.substr(7);
            return (valueName.length  === 0) ? value : jmespath.search(data, valueName);
        } else {
            return misc.interpolate(value, data);
        }
    },

    hasKeys: (obj) => {
        if (!obj)
            return false;
        return Object.keys(obj).length > 0;
    }

}
module.exports = misc;