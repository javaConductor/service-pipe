module.exports = (function (misc, jmespath) {
    class AggregationExtraction {
        constructor(aggExtractionType) {
            switch (aggExtractionType) {
                case AggregationExtraction.Types.AsArray: {
                    this.aggData = [];
                    break;
                }
                case AggregationExtraction.Types.AsObject:
                case AggregationExtraction.Types.AsNormal: {
                    this.aggData = {};
                    break;
                }
                default:
                    throw new Error(`No such ExtractionType: [${aggExtractionType}]`);
            }
            this.aggExtractionType = aggExtractionType;

        }

        createAggregationData(value, aggregateExtract) {
            ////By default, we pass the element[idx] of the array to the node
            let aggValue = value;
            // if an aggregateExtract is defined then we pass
            // the data in the element[idx] at the specified dataPath to the node
            if (aggregateExtract && aggregateExtract.dataPath) {
                aggValue = jmespath.search(aggValue, aggregateExtract.dataPath);
            }
            const aggData = {[aggregateExtract.aggDataKey]: aggValue};
            return aggData;
        }

        accumulateExtractionResults(results) {

            switch (this.aggExtractionType) {
                case AggregationExtraction.Types.AsArray: {
                    if (typeof results === 'object')
                        results = misc.clean(results);
                    this.aggData = [...this.aggData, results];
                    break;
                }
                case AggregationExtraction.Types.AsObject:
                case AggregationExtraction.Types.AsNormal: {
                    if (typeof results === 'object')
                        results = misc.clean(results);
                    this.aggData = {...this.aggData, ...results};
                    break;
                }
            }
        }

        getExtractionResults(dataOutputKey) {
            switch (this.aggExtractionType) {
                case AggregationExtraction.Types.AsArray:
                    return {[dataOutputKey]: this.aggData};
                case AggregationExtraction.Types.AsObject:
                    return {[dataOutputKey]: this.aggData};
                case AggregationExtraction.Types.AsNormal:
                    return this.aggData;
            }
        }
    }

    AggregationExtraction.Types = (function () {
        let obj = {
            AsArray: 'arrayExtraction:',
            AsObject: 'objectExtraction:',
            AsNormal: 'normalExtraction:',
        }
        obj.isType = (t) => ([obj.AsArray, obj.AsNormal, obj.AsObject].includes(t));
        return obj;
    })();

    return AggregationExtraction;
})(require('../misc'), require('jmespath'));
