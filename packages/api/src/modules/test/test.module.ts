import { Module } from "@nestjs/common";

import { UploadModule } from "../upload/upload.module";
import { TestController } from "./controllers/test.controller";

@Module({
    imports: [UploadModule],
    controllers: [TestController],
    providers: [],
    exports: [],
})
export class TestModule {}
