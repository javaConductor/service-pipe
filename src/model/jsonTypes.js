module.exports = (function () {

    class JSONTypes {
        constructor() {
            this.types = ['object:', 'array:', 'string', 'number', 'date:', 'any:'];
            this.typeMap = {
                Object: 'object:',
                Array: 'array:',
                String: 'string',
                Number: 'number',
                Date: 'date:',
                Any: 'any:'
            };
        }

        isType(t) {
            return this.types.includes(t);
        }

        validate(type, value) {
            switch (type) {
                case this.typeMap.Object: {
                    return typeof value === 'object';
                }
                case this.typeMap.Array: {
                    return value instanceof Array;

                }
                case this.typeMap.String: {
                    return typeof value === 'string';
                }
                case this.typeMap.Number: {
                    return typeof value === 'number';

                }
                case this.typeMap.Date: {
                    return typeof value === 'date';
                }
                case this.typeMap.Any: {
                    return true;
                }

                case "": {
                    return true;
                }

                default:
                    return false;
            }
        }

    }

    return new JSONTypes();
})();