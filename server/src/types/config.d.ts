export interface RedisConfig {
    url: string;
  }
  
  export interface MinioConfig {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  }
  
  export interface Config {
    redis: RedisConfig;
    minio: MinioConfig;
  } 