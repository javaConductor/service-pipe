module.exports = (function (jmespath) {
        /**
         * Extracts values from data object based on jmesPath query
         *
         *
         * @param contentType only supports "application/json
         * @param data DATA to extract from using sourceJmesPath
         * @param  extractDescriptors Array of extract descriptors:
         *                  {
         *                      destinationElement: element to which the datA is extracted
         *                      sourceJmesPath: the location of the value(s) to extract
         *                  }
         * @returns {*[data, error]}
         */
        function extract(contentType, data, extractDescriptors = []) {
            console.assert(data, `NO data passed to extract: [${JSON.stringify(data)}] `);
            switch (contentType) {
                case 'application/json': {
                    return extractJSON(data, extractDescriptors);
                }
                default:
                    return [null, `Bad contentType: ${contentType}`];
            }
        }

        function extractJSON(obj, extractDescriptors) {
            // if no extract descriptors return original data object
            if (!extractDescriptors || extractDescriptors.length === 0)
                return [obj];

            let extracted = {}
            for (descriptor of extractDescriptors) {
                const source = descriptor.sourceJmesPath
                const destination = descriptor.destinationElement

                if (!source || source.trim().length === 0
                    || !destination || destination.trim().length === 0) {
                    continue
                }

                if (source === '-') {
                    extracted = {...extracted, [destination]: obj}
                } else {
                    let extractedValue;
                    // find value
                    try {
                        extractedValue = jmespath.search(obj, source);
                    } catch (e) {
                        return [null, `jmespath error: ${e.message}`]
                    }

                    extracted = {...extracted, [destination]: extractedValue}
                }
            }

            console.debug(`extractJSON(${JSON.stringify(obj)}, ${JSON.stringify(extractDescriptors)}) -> ${JSON.stringify(extracted)}`)
            return [extracted];
        }

        return {extract};
    }
)(require('jmespath'));
