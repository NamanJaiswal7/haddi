"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEventType = exports.getValidEventTypes = exports.isValidEventType = void 0;
/**
 * Validates event type against the allowed enum values
 * @param type - The event type to validate
 * @returns true if valid, false otherwise
 */
const isValidEventType = (type) => {
    const validEventTypes = ['festival', 'study_circle', 'kirtan', 'seminar', 'workshop', 'spiritual', 'other'];
    return validEventTypes.includes(type);
};
exports.isValidEventType = isValidEventType;
/**
 * Gets the list of valid event types
 * @returns Array of valid event type strings
 */
const getValidEventTypes = () => {
    return ['festival', 'study_circle', 'kirtan', 'seminar', 'workshop', 'spiritual', 'other'];
};
exports.getValidEventTypes = getValidEventTypes;
/**
 * Validates event type and returns error message if invalid
 * @param type - The event type to validate
 * @returns Error message if invalid, null if valid
 */
const validateEventType = (type) => {
    if (!(0, exports.isValidEventType)(type)) {
        return `Invalid event type. Must be one of: ${(0, exports.getValidEventTypes)().join(', ')}`;
    }
    return null;
};
exports.validateEventType = validateEventType;
