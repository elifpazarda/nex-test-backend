# QA Platform — Backend

NestJS + TypeScript + Prisma + PostgreSQL tabanlı backend projesi.

---

## Proje Başlatma

```bash
npm install -g @nestjs/cli

nest new qa-backend
# package manager: npm seç

cd qa-backend
```

---

## Bağımlılıklar

```bash
npm install \
  @nestjs/config \
  @nestjs/jwt \
  @nestjs/passport \
  @prisma/client \
  @anthropic-ai/sdk \
  passport \
  passport-jwt \
  passport-local \
  bcryptjs \
  class-validator \
  class-transformer

npm install -D \
  @types/bcryptjs \
  @types/passport-jwt \
  @types/passport-local \
  prisma
```

---

## Ortam Değişkenleri

`.env` dosyası oluştur:

```env
PORT=3001
NODE_ENV=development

DATABASE_URL="postgresql://postgres:password@localhost:5432/qa_platform"

JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_REFRESH_EXPIRES_IN=7d

ANTHROPIC_API_KEY=sk-ant-...

FRONTEND_URL=http://localhost:3000
```

---

## Prisma Kurulum

```bash
npx prisma init
```

`prisma/schema.prisma` dosyasını aşağıdaki içerikle güncelle:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  password  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]

  @@map("users")
}

model Project {
  id          String         @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarios   TestScenario[]

  @@map("projects")
}

model TestScenario {
  id              String   @id @default(cuid())
  title           String
  input           String   @db.Text
  rawOutput       String   @db.Text
  bddOutput       String   @db.Text
  qualityScore    Int
  qualityFeedback String   @db.Text
  projectId       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("test_scenarios")
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Klasör Yapısı

`src/` altında aşağıdaki yapıyı oluştur:

```
src/
  main.ts
  app.module.ts
  prisma/
    prisma.service.ts
    prisma.module.ts
  common/
    guards/
      jwt-auth.guard.ts
    decorators/
      current-user.decorator.ts
  auth/
    dto/
      auth.dto.ts
    auth.service.ts
    auth.controller.ts
    auth.module.ts
    jwt.strategy.ts
  projects/
    dto/
      project.dto.ts
    projects.service.ts
    projects.controller.ts
    projects.module.ts
  scenarios/
    dto/
      scenario.dto.ts
    scenarios.service.ts
    scenarios.controller.ts
    scenarios.module.ts
  ai/
    ai.service.ts
    ai.module.ts
```

---

## Dosya İçerikleri

### `src/main.ts`

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}

bootstrap();
```

---

### `src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectsModule } from "./projects/projects.module";
import { ScenariosModule } from "./scenarios/scenarios.module";
import { AiModule } from "./ai/ai.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    ScenariosModule,
    AiModule,
  ],
})
export class AppModule {}
```

---

### `src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### `src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

### `src/common/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

### `src/common/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserData {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

---

### `src/auth/dto/auth.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

### `src/auth/jwt.strategy.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get("JWT_SECRET"),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

### `src/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("Bu email zaten kullanılıyor");

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Geçersiz kimlik bilgileri");

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException("Geçersiz kimlik bilgileri");

    return this.generateTokens(user.id, user.email);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get("JWT_SECRET"),
      expiresIn: this.config.get("JWT_EXPIRES_IN"),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN"),
    });
    return { accessToken, refreshToken };
  }
}
```

### `src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserData } from "../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: CurrentUserData) {
    return this.authService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout() {
    return { message: "Çıkış yapıldı" };
  }
}
```

### `src/auth/auth.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

---

### `src/projects/dto/project.dto.ts`

```typescript
import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
```

### `src/projects/projects.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { scenarios: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Proje bulunamadı");
    if (project.userId !== userId) throw new ForbiddenException("Bu projeye erişim yetkiniz yok");
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({ data: { ...dto, userId } });
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.findOne(id, userId);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { message: "Proje silindi" };
  }
}
```

### `src/projects/projects.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserData } from "../common/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.projectsService.findAll(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.findOne(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.create(user.id, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.update(id, user.id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.remove(id, user.id);
  }
}
```

### `src/projects/projects.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";

@Module({
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

---

### `src/ai/ai.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get("ANTHROPIC_API_KEY") });
  }

  async generateTestScenario(input: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Sen bir kıdemli QA mühendisisin. Aşağıdaki açıklama için kapsamlı test senaryoları üret.

Açıklama: ${input}

Şu başlıkları içeren test senaryoları yaz:
- Happy path (başarılı akış)
- Edge case'ler (sınır durumlar)
- Negatif senaryolar (hata durumları)

Her senaryo için: Senaryo adı, ön koşullar, adımlar, beklenen sonuç.`,
      }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async convertToBdd(rawScenario: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Aşağıdaki test senaryolarını Gherkin BDD formatına (Feature, Scenario, Given, When, Then) dönüştür. Sadece Gherkin formatında çıktı ver.

Test Senaryoları:
${rawScenario}`,
      }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async evaluateQuality(rawScenario: string): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Aşağıdaki test senaryolarını kalite açısından değerlendir.

Değerlendirme kriterleri:
- Kapsam genişliği (happy path, edge case, negatif)
- Adımların netliği
- Beklenen sonuçların açıklığı

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey ekleme:
{"score": <0-100 arası tam sayı>, "feedback": "<kısa değerlendirme metni>"}

Test Senaryoları:
${rawScenario}`,
      }],
    });

    try {
      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const parsed = JSON.parse(text);
      return { score: parsed.score ?? 50, feedback: parsed.feedback ?? "" };
    } catch {
      return { score: 50, feedback: "Değerlendirme yapılamadı" };
    }
  }
}
```

### `src/ai/ai.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

---

### `src/scenarios/dto/scenario.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength, IsNumber, IsOptional } from "class-validator";

export class GenerateScenarioDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  input: string;
}

export class SaveScenarioDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  rawOutput: string;

  @IsString()
  @IsNotEmpty()
  bddOutput: string;

  @IsNumber()
  qualityScore: number;

  @IsString()
  @IsOptional()
  qualityFeedback?: string;
}
```

### `src/scenarios/scenarios.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { ProjectsService } from "../projects/projects.service";
import { GenerateScenarioDto, SaveScenarioDto } from "./dto/scenario.dto";

@Injectable()
export class ScenariosService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private projectsService: ProjectsService
  ) {}

  async generate(dto: GenerateScenarioDto, userId: string) {
    await this.projectsService.findOne(dto.projectId, userId);

    const rawOutput = await this.aiService.generateTestScenario(dto.input);
    const bddOutput = await this.aiService.convertToBdd(rawOutput);
    const { score, feedback } = await this.aiService.evaluateQuality(rawOutput);

    return { rawOutput, bddOutput, qualityScore: score, qualityFeedback: feedback };
  }

  async save(dto: SaveScenarioDto, userId: string) {
    await this.projectsService.findOne(dto.projectId, userId);
    return this.prisma.testScenario.create({
      data: {
        title: dto.title,
        input: dto.input,
        rawOutput: dto.rawOutput,
        bddOutput: dto.bddOutput,
        qualityScore: dto.qualityScore,
        qualityFeedback: dto.qualityFeedback ?? "",
        projectId: dto.projectId,
      },
    });
  }

  async findByProject(projectId: string, userId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.prisma.testScenario.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!scenario) throw new NotFoundException("Senaryo bulunamadı");
    if (scenario.project.userId !== userId) throw new ForbiddenException("Erişim yetkisi yok");
    return scenario;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.testScenario.delete({ where: { id } });
    return { message: "Senaryo silindi" };
  }
}
```

### `src/scenarios/scenarios.controller.ts`

```typescript
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ScenariosService } from "./scenarios.service";
import { GenerateScenarioDto, SaveScenarioDto } from "./dto/scenario.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserData } from "../common/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("scenarios")
export class ScenariosController {
  constructor(private scenariosService: ScenariosService) {}

  @Post("generate")
  generate(@Body() dto: GenerateScenarioDto, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.generate(dto, user.id);
  }

  @Post()
  save(@Body() dto: SaveScenarioDto, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.save(dto, user.id);
  }

  @Get("project/:projectId")
  findByProject(@Param("projectId") projectId: string, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.findByProject(projectId, user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.findOne(id, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.remove(id, user.id);
  }
}
```

### `src/scenarios/scenarios.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ScenariosService } from "./scenarios.service";
import { ScenariosController } from "./scenarios.controller";
import { AiModule } from "../ai/ai.module";
import { ProjectsModule } from "../projects/projects.module";

@Module({
  imports: [AiModule, ProjectsModule],
  providers: [ScenariosService],
  controllers: [ScenariosController],
})
export class ScenariosModule {}
```

---

## API Endpoint Listesi

### Auth — `/api/auth`
| Method | Endpoint | Guard | Açıklama |
|--------|----------|-------|----------|
| POST | /register | — | Kayıt ol |
| POST | /login | — | Giriş yap → token döner |
| GET | /me | JWT | Aktif kullanıcı bilgisi |
| POST | /logout | JWT | Çıkış |

### Projects — `/api/projects`
| Method | Endpoint | Guard | Açıklama |
|--------|----------|-------|----------|
| GET | / | JWT | Kullanıcının projeleri |
| GET | /:id | JWT | Proje detay |
| POST | / | JWT | Proje oluştur |
| PATCH | /:id | JWT | Proje güncelle |
| DELETE | /:id | JWT | Proje sil |

### Scenarios — `/api/scenarios`
| Method | Endpoint | Guard | Açıklama |
|--------|----------|-------|----------|
| POST | /generate | JWT | Claude ile senaryo üret (kaydetmez) |
| POST | / | JWT | Senaryoyu kaydet |
| GET | /project/:id | JWT | Projenin senaryoları |
| GET | /:id | JWT | Senaryo detay |
| DELETE | /:id | JWT | Senaryo sil |

---

## Çalıştırma

```bash
npm run start:dev
```

Sunucu `http://localhost:3001/api` adresinde çalışır.
