"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    console.log('✅ Supabase URL:', configService.get('SUPABASE_URL'));
    console.log('✅ Supabase Key:', configService.get('SUPABASE_ANON_KEY'));
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map