let traceElements = [];
let lastElement = {};
module.exports = {

    addTrace: (traceData) => {
        lastElement = {...lastElement, ...traceData}
        traceElements.push(traceData)
        return lastElement;
    },

    getTrace: () => {
        return traceElements;
    },

    clearTrace: () => {
        traceElements = []
        lastElement = {}
    }

}