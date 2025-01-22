
const traceElements = [];
let lastElement= {};
module.exports =   {

    addTrace: (traceData) => {
        lastElement = {...lastElement, ...traceData}
        traceElements.push(lastElement)
        return lastElement;
    },

    getTrace: () => {
        return traceElements;
    },

    clearTrace: () => {
        traceElements.slice(0, traceElements.length)
    }

}