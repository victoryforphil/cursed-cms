export class ServerError extends Error {
    constructor(
      message: string,
      public status: number = 400,
      public details?: Record<string, any>
    ) {
      super(message);
      this.name = 'ServerError';
    }
  
    toResponse() {
      return {
        message: this.message,
        status: this.status
      }
    }
  }

  export interface RestResult<T> {
    http_status: number;
    success: boolean;
    message: string;
    content: T;
}

export const makeRestResult = <T>(
    content: T, 
    message: string = '', 
    success: boolean = true,
    http_status: number = 200
): RestResult<T> => {
    return {
        http_status,
        success,
        message,
        content
    }
}

export const makeErrorResult = <T>(
    message: string,
    http_status: number = 500,
    content?: T
): RestResult<T | null> => {
    return {
        http_status,
        success: false,
        message,
        content: content || null
    }
}