import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { Response } from "@buildingai/core/interfaces";
import { FileUrlService } from "@buildingai/db";
import {
    FILE_URL_METADATA_KEY,
    FileUrlConfig,
    FileUrlFieldConfig,
} from "@buildingai/decorators/file-url.decorator";
import { SKIP_TRANSFORM_KEY } from "@buildingai/decorators/skip-transform.decorator";
import { FileUrlProcessorUtil } from "@buildingai/utils";
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";

/**
 * 全局响应转换拦截器
 *
 * 将所有接口响应统一转换为标准的 RESTful 格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    private readonly logger = new Logger(TransformInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly fileUrlService: FileUrlService,
    ) {}
    /**
     * 拦截器处理方法
     *
     * @param context 执行上下文
     * @param next 调用处理器
     * @returns 统一格式的响应数据
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        // 检查是否跳过响应转换
        const skipTransform = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 如果标记为跳过，直接返回原始数据
        if (skipTransform) {
            return next.handle();
        }

        // 获取响应对象
        const response = context.switchToHttp().getResponse();
        // 获取状态码（默认为200）
        const statusCode = response.statusCode || 200;

        return next.handle().pipe(
            mergeMap(async (data) => {
                // 如果是删除操作且没有返回数据，则返回成功信息
                if (statusCode === 204 && !data) {
                    return {
                        code: BusinessCode.SUCCESS,
                        message: "ok",
                        data: null,
                        timestamp: Date.now(),
                    };
                }

                // 如果响应已经是标准格式，则不做处理
                if (data && typeof data === "object" && "code" in data && "message" in data) {
                    return data;
                }

                // 返回统一格式的响应，使用业务状态码
                return {
                    code: BusinessCode.SUCCESS, // 统一使用成功状态码
                    message: "ok",
                    data: await this.buildFileUrl(data, context),
                    timestamp: Date.now(),
                };
            }),
        );
    }

    /**
     * 构建文件URL
     *
     * @param responseData 响应数据
     * @param context 执行上下文
     * @returns 处理后的响应数据
     */
    private async buildFileUrl(responseData: any, context: ExecutionContext): Promise<any> {
        if (!responseData) {
            return responseData;
        }

        // 获取控制器方法上的文件URL配置
        const fileUrlConfig = this.reflector.get<FileUrlConfig>(
            FILE_URL_METADATA_KEY,
            context.getHandler(),
        );

        if (!fileUrlConfig || !fileUrlConfig.fields || fileUrlConfig.fields.length === 0) {
            return responseData;
        }
        // 处理文件URL字段
        return await this.processFileUrlFields(responseData, fileUrlConfig.fields, context);
    }

    /**
     * 处理文件URL字段（高性能版本）
     *
     * @param data 数据对象
     * @param fields 需要处理的字段配置
     * @param context 执行上下文
     * @returns 处理后的数据
     */
    private async processFileUrlFields(
        data: any,
        fields: (string | FileUrlFieldConfig)[],
        context?: ExecutionContext,
    ): Promise<any> {
        if (!data || typeof data !== "object") {
            return data;
        }

        // 获取请求域名作为兜底方案
        const requestDomain = this.getRequestDomain(context);

        // 转换字段配置为字符串数组
        const fieldPatterns = fields.map((field) =>
            typeof field === "string" ? field : field.field,
        );

        // 使用高性能处理工具
        const result = await FileUrlProcessorUtil.processFieldsEfficiently(
            data,
            fieldPatterns,
            async (path: string) => await this.fileUrlService.get(path, requestDomain),
        );

        // 定期清理缓存以避免内存泄漏
        FileUrlProcessorUtil.cleanupCache(1000);

        return result;
    }

    /**
     * 获取请求域名
     *
     * @param context 执行上下文
     * @returns 请求域名（格式: protocol://host）
     */
    private getRequestDomain(context?: ExecutionContext): string | undefined {
        if (!context) {
            return undefined;
        }

        try {
            const request = context.switchToHttp().getRequest();
            if (!request) {
                return undefined;
            }

            // 获取协议,优先使用代理头(X-Forwarded-Proto)
            let protocol =
                request.get("x-forwarded-proto") ||
                request.headers?.["x-forwarded-proto"] ||
                request.protocol ||
                "http";

            // 处理可能的多个协议值(逗号分隔),取第一个
            if (typeof protocol === "string" && protocol.includes(",")) {
                protocol = protocol.split(",")[0].trim();
            }

            // 获取主机名(包含端口),优先使用代理头(X-Forwarded-Host)
            let host: string | string[] | undefined =
                request.get("x-forwarded-host") ||
                request.headers?.["x-forwarded-host"] ||
                request.get("host") ||
                request.headers?.host;

            // 如果是生产环境的域名（非 localhost/IP），默认使用 https
            const hostStr = Array.isArray(host) ? host[0] : host || "";
            const isProductionDomain =
                typeof hostStr === "string" &&
                !hostStr.includes("localhost") &&
                !hostStr.includes("127.0.0.1") &&
                !hostStr.match(/^\d+\.\d+\.\d+\.\d+/) &&
                !hostStr.includes(":"); // 没有端口号的域名通常是生产环境

            // 生产域名且协议检测为 http 时，强制使用 https
            if (isProductionDomain && protocol !== "https") {
                protocol = "https";
            } else {
                // 确保协议是 http 或 https
                protocol = protocol === "https" ? "https" : "http";
            }

            if (!host) {
                return undefined;
            }

            // 转换为字符串,如果是数组则取第一个
            if (Array.isArray(host)) {
                host = host[0];
            }

            // 确保 host 是字符串类型
            if (typeof host !== "string") {
                return undefined;
            }

            // 处理可能的多个主机值(逗号分隔),取第一个
            if (host.includes(",")) {
                host = host.split(",")[0].trim();
            }

            // 先检查端口,根据端口修正协议
            if (host.includes(":443")) {
                protocol = "https";
            } else if (host.includes(":80")) {
                protocol = "http";
            }

            // 移除默认端口(http:80, https:443)
            host = this.normalizeHost(host, protocol);

            const result = `${protocol}://${host}`;

            return result;
        } catch (error) {
            this.logger.error("获取请求域名失败", error);
            return undefined;
        }
    }

    /**
     * 标准化主机名,移除默认端口
     *
     * @param host 主机名(可能包含端口)
     * @param protocol 协议
     * @returns 标准化后的主机名
     */
    private normalizeHost(host: string, protocol: string): string {
        // 使用正则表达式移除默认端口
        const normalizedHost =
            protocol === "https"
                ? host.replace(/:443$/, "") // 移除 https 的 :443
                : host.replace(/:80$/, ""); // 移除 http 的 :80

        return normalizedHost;
    }
}
