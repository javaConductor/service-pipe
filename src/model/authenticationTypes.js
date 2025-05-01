const types = {Basic: 'Basic', Token: 'Token', None: 'none'}

module.exports = {
    ...types,
    list: Object.values(types)
    // isType: (t) => {
    //     return types.includes(t);
    // }
};
