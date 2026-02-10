/**
 * User configuration key with optional group
 */
export interface UserDictKey {
    /**
     * Configuration key
     */
    key: string;

    /**
     * Configuration group, defaults to 'default'
     */
    group?: string;
}

/**
 * User configuration set options
 */
export interface UserDictSetOptions {
    /**
     * Configuration group
     */
    group?: string;

    /**
     * Configuration description
     */
    description?: string;
}

/**
 * User configuration item for batch operations
 */
export interface UserDictItem {
    /**
     * Configuration key
     */
    key: string;

    /**
     * Configuration value
     */
    value: any;

    /**
     * Configuration group
     */
    group?: string;

    /**
     * Configuration description
     */
    description?: string;
}

/**
 * User configuration result
 */
export interface UserDictResult<T = any> {
    /**
     * Configuration key
     */
    key: string;

    /**
     * Configuration value
     */
    value: T;

    /**
     * Configuration group
     */
    group: string;
}
