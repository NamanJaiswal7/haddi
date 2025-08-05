/**
 * Validates event type against the allowed enum values
 * @param type - The event type to validate
 * @returns true if valid, false otherwise
 */
export const isValidEventType = (type: string): boolean => {
    const validEventTypes = ['festival', 'study_circle', 'kirtan', 'seminar', 'workshop', 'spiritual', 'other'];
    return validEventTypes.includes(type);
};

/**
 * Gets the list of valid event types
 * @returns Array of valid event type strings
 */
export const getValidEventTypes = (): string[] => {
    return ['festival', 'study_circle', 'kirtan', 'seminar', 'workshop', 'spiritual', 'other'];
};

/**
 * Validates event type and returns error message if invalid
 * @param type - The event type to validate
 * @returns Error message if invalid, null if valid
 */
export const validateEventType = (type: string): string | null => {
    if (!isValidEventType(type)) {
        return `Invalid event type. Must be one of: ${getValidEventTypes().join(', ')}`;
    }
    return null;
}; 