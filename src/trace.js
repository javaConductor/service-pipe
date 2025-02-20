let traces = {};

const createTrace = (executionId) => {

    let traceElements = [];

    const addTrace = (traceData) => {
        const tData = {...traceData, '@executionId': executionId};
        traceElements.push(tData)
        return tData;
    }

    const getTrace = () => {
        return traceElements;
    }

    const clearTrace = () => {
        traceElements = []
    }
    return {
        addTrace, getTrace, clearTrace
    }

}

const get = (executionId) => {

    if (!traces[executionId]) {
        traces[executionId] = createTrace(executionId);
    }
    return traces[executionId];

}
module.exports = get