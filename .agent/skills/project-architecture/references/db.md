# @buildingai/db

Database layer with TypeORM.

## Location
`packages/@buildingai/db/`

## Exports
- Entities from `@buildingai/db/entities`
- TypeORM from `@buildingai/db/typeorm`
- `FileUrlModule` - File URL building
- `NormalizeFileUrl` - Entity decorator for file URLs
- `BaseSeeder` - Base seeder class

## Entities

```typescript
import { User, Order } from "@buildingai/db/entities";
```

Common entities: `User`, `Menu`, `Permission`, `Role`, `AiProvider`, `AiModel`, `AiChatRecord`, `AiChatMessage`, `Datasets`, `AccountLog`, etc.

## Using in Services

```typescript
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Repository, DataSource } from "@buildingai/db/typeorm";

@Injectable()
export class UserService extends BaseService<User> {
    constructor(
        @InjectRepository(User) repository: Repository<User>,
        private dataSource: DataSource
    ) {
        super(repository);
    }
}
```

## Transactions

```typescript
// Using DataSource
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
    await queryRunner.manager.save(user);
    await queryRunner.commitTransaction();
} catch (error) {
    await queryRunner.rollbackTransaction();
} finally {
    await queryRunner.release();
}

// Using BaseService.withTransaction()
await this.withTransaction(async (manager) => {
    await manager.save(user);
    await manager.save(order);
});
```

## File URLs

```typescript
// Entity
@Entity()
export class User {
    @Column()
    @NormalizeFileUrl()
    avatar: string; // Auto-converts to full URL
}

// Controller
@BuildFileUrl(["avatar"])
@Get("profile")
async getProfile() {
    return user; // avatar is full URL
}
```

## Common Queries

```typescript
import { In, ILike, Raw } from "@buildingai/db/typeorm";

// Relations
const user = await repo.findOne({ where: { id }, relations: ["orders"] });

// Conditions
const users = await repo.find({
    where: { status: In(["active"]), name: ILike(`%${search}%`) }
});

// QueryBuilder
const users = await repo.createQueryBuilder("user")
    .leftJoinAndSelect("user.orders", "order")
    .where("user.status = :status", { status: "active" })
    .getMany();
```
