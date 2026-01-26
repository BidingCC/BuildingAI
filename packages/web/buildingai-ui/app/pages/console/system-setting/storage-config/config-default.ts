import type { AliyunOssConfig } from "@buildingai/constants/shared";

function aliyunOSSDefaultConfig(): AliyunOssConfig {
    return { accessKey: "", arn: "", bucket: "", domain: "", region: "", secretKey: "" };
}

export { aliyunOSSDefaultConfig };
