export enum StorageErrorCode {
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    INVALID_INPUT = 'INVALID_INPUT',
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class StorageError extends Error {
    constructor(
        public code: StorageErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'StorageError';
    }
}
