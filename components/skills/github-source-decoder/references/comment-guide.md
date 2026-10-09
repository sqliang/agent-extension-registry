# 中文注释添加指南

为源代码添加中文注释的规范和最佳实践。

## 注释原则

1. **解释"为什么"** - 不仅说明代码做什么，更要说明为什么这样做
2. **适度详细** - 对于复杂逻辑要详细解释，简单代码保持简洁
3. **保持更新** - 修改代码时同步更新注释
4. **中文优先** - 面向中文用户，使用清晰的中文表达

## 需要添加注释的位置

### 1. 文件头部
每个核心文件都应该有头部注释：

```python
"""
模块名称: xxx
功能描述: [简要描述本模块的功能]
设计思路: [说明设计思路和关键点]
作者: [原作者]
修改记录: [如有重大修改，记录修改内容]
"""
```

```typescript
/**
 * 模块名称: xxx
 * 功能描述: [简要描述本模块的功能]
 * 设计思路: [说明设计思路和关键点]
 * 作者: [原作者]
 * 修改记录: [如有重大修改，记录修改内容]
 */

// Node.js 模块
import { SomeService } from './services';

export class MyModule {
  // ...
}
```

### 2. 复杂函数/方法

```python
def process_data(data, config):
    """
    处理原始数据并生成结构化输出

    参数:
        data: 原始数据，格式为...
        config: 配置字典，包含以下字段:
            - threshold: 阈值，默认 0.5
            - method: 处理方法，可选 'a'|'b'|'c'

    返回:
        处理后的结构化数据

    设计说明:
        这里使用了 XYZ 算法而不是 ABC，因为...
        性能优化点:...
    """
    # 实现...
```

```typescript
/**
 * 处理用户数据并生成分析报告
 *
 * @param userData - 用户原始数据，包含用户行为记录
 * @param options - 配置选项
 * @param options.threshold - 相似度阈值，默认 0.75
 * @param options.includeDetails - 是否包含详细信息，默认 true
 * @returns 分析结果，包含用户画像和推荐内容
 *
 * @throws {ValidationError} 当输入数据格式不正确时抛出
 * @throws {ApiError} 当调用外部 API 失败时抛出
 *
 * 设计说明:
 *   使用流式处理避免大内存占用，特别适合处理大量用户数据
 *   采用并行处理策略，利用 Node.js 的 worker_threads 提升性能
 */
async function analyzeUserData(
  userData: UserData[],
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  // 实现...
}
```

### 3. 关键算法

```python
# 计算最短路径 - 使用 Dijkstra 算法
# 时间复杂度: O((V+E)logV)，其中 V 是顶点数，E 是边数
# 选择原因: 图中没有负权边，且需要最优解
def find_shortest_path(graph, start, end):
    # 初始化距离字典，所有节点距离设为无穷大
    distances = {node: float('inf') for node in graph}
    distances[start] = 0  # 起点距离为 0

    # 使用优先队列优化，每次取出距离最小的节点
    # ...
```

```typescript
/**
 * 令牌桶限流算法实现
 *
 * 时间复杂度: O(1)，每个请求的处理时间是常数
 * 空间复杂度: O(n)，n 是不同的用户 ID 数量
 *
 * 选择原因:
 *   - 平滑限流，允许突发流量
 *   - 内存占用可控，每个用户只需要保存少量状态
 *   - 分布式友好，可以通过 Redis 共享状态
 *
 * @param userId - 用户 ID，用于识别不同的限流主体
 * @param capacity - 桶的容量，即最大允许的突发请求数
 * @param refillRate - 每秒补充的令牌数
 * @returns 是否允许通过请求
 */
function tokenBucketRateLimit(
  userId: string,
  capacity: number = 10,
  refillRate: number = 2
): boolean {
  // 使用 Map 保存每个用户的令牌桶状态
  const bucket = userBuckets.get(userId) || {
    tokens: capacity,
    lastRefill: Date.now()
  };

  // 计算需要补充的令牌数
  const now = Date.now();
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = elapsedSeconds * refillRate;

  // 补充令牌，但不超过容量
  bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  // 检查是否有足够的令牌
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    userBuckets.set(userId, bucket);
    return true;
  }

  userBuckets.set(userId, bucket);
  return false;
}
```

### 4. 设计模式实现

```python
# 单例模式实现
# 使用 __new__ 方法确保只有一个实例被创建
# 线程安全: 使用双重检查锁定机制
class Singleton:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:  # 第一次检查（无锁）
            with cls._lock:         # 获取锁
                if cls._instance is None:  # 第二次检查（有锁）
                    cls._instance = super().__new__(cls)
        return cls._instance
```

```typescript
/**
 * 单例模式 - 数据库连接池
 *
 * 使用 TypeScript 的私有构造函数和静态方法实现单例
 * 为什么使用单例：
 *   - 数据库连接是昂贵资源，需要共享
 *   - 避免创建多个连接池导致资源耗尽
 *   - 统一管理连接生命周期
 *
 * 线程安全：Node.js 是单线程的，不需要额外的同步机制
 */
class DatabasePool {
  private static instance: DatabasePool | null = null;
  private connections: Connection[] = [];
  private maxConnections: number = 10;

  // 私有构造函数，防止外部直接实例化
  private constructor(config: DatabaseConfig) {
    this.initializePool(config);
  }

  /**
   * 获取单例实例
   * @param config - 数据库配置（仅在首次调用时需要）
   * @returns 数据库连接池实例
   */
  public static getInstance(config?: DatabaseConfig): DatabasePool {
    if (!DatabasePool.instance) {
      if (!config) {
        throw new Error('首次调用必须提供配置');
      }
      DatabasePool.instance = new DatabasePool(config);
    }
    return DatabasePool.instance;
  }

  /**
   * 获取数据库连接
   * @returns Promise<Connection>
   */
  public async getConnection(): Promise<Connection> {
    // 实现连接获取逻辑...
  }

  private initializePool(config: DatabaseConfig): void {
    // 初始化连接池...
  }
}

/**
 * 工厂模式 - 日志记录器创建
 *
 * 根据环境自动选择不同的日志实现
 * 开发环境：使用 console.log，便于调试
 * 生产环境：使用 winston，支持日志级别和持久化
 */
class LoggerFactory {
  /**
   * 创建日志记录器
   * @param environment - 运行环境
   * @returns 日志记录器实例
   */
  public static createLogger(environment: string): Logger {
    switch (environment) {
      case 'production':
        return new WinstonLogger({
          level: 'info',
          transports: [new transports.File({ filename: 'app.log' })]
        });
      case 'development':
      default:
        return new ConsoleLogger({
          level: 'debug',
          colors: true
        });
    }
  }
}
```

### 5. 业务逻辑关键节点

```python
def checkout_order(order_id, user_id):
    # 1. 验证订单状态 - 必须是 'pending' 状态才能 checkout
    # 防止重复支付和状态不一致
    order = Order.objects.get(id=order_id)
    if order.status != 'pending':
        raise InvalidOrderStatus("订单状态不正确")

    # 2. 检查库存 - 乐观锁机制
    # 使用 version 字段防止并发问题
    # ...

    # 3. 创建支付记录 - 幂等性设计
    # 使用幂等键确保同一订单不会重复创建支付
    # ...
```

```typescript
/**
 * 处理订单支付流程
 *
 * @param orderId - 订单 ID
 * @param userId - 用户 ID
 * @param paymentMethod - 支付方式信息
 * @returns 支付结果
 *
 * 业务流程说明：
 *   1. 验证订单状态 - 必须是 'pending' 状态才能支付
 *      防止重复支付和状态不一致问题
 *
 *   2. 验证用户权限 - 只有订单创建者才能支付
 *      使用用户 ID 与订单中的用户 ID 比对
 *
 *   3. 检查库存 - 乐观锁机制
 *      使用 version 字段防止并发超卖
 *      如果库存检查失败，回滚整个事务
 *
 *   4. 创建支付记录 - 幂等性设计
 *      使用 orderId 作为幂等键
 *      确保同一订单不会重复创建支付记录
 *
 *   5. 调用第三方支付 - 超时和重试策略
 *      超时设置 15 秒，防止长时间阻塞
 *      失败重试 2 次，使用指数退避
 *
 *   6. 更新订单状态 - 事务保护
 *      所有操作在一个数据库事务中
 *      任何一步失败都回滚整个流程
 */
async function processOrderPayment(
  orderId: string,
  userId: string,
  paymentMethod: PaymentMethod
): Promise<PaymentResult> {
  // 使用数据库事务确保一致性
  return await db.transaction(async (tx) => {
    // 1. 验证订单状态
    const order = await tx.orders.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    if (order.status !== 'pending') {
      throw new InvalidOrderStatusError('订单状态不正确');
    }

    // 2. 验证用户权限
    if (order.userId !== userId) {
      throw new PermissionDeniedError('无权操作此订单');
    }

    // 3. 检查库存（使用乐观锁）
    for (const item of order.items) {
      const product = await tx.products.findUnique({
        where: { id: item.productId }
      });
      if (!product || product.stock < item.quantity) {
        throw new InsufficientStockError(item.productId);
      }

      // 更新库存，使用 version 防止并发
      await tx.products.update({
        where: {
          id: item.productId,
          version: product.version
        },
        data: {
          stock: product.stock - item.quantity,
          version: product.version + 1
        }
      });
    }

    // 4. 创建支付记录（幂等）
    const existingPayment = await tx.payments.findUnique({
      where: { orderId }
    });
    if (existingPayment) {
      return { success: true, paymentId: existingPayment.id };
    }

    const payment = await tx.payments.create({
      data: {
        orderId,
        userId,
        amount: order.totalAmount,
        status: 'pending'
      }
    });

    // 5. 调用第三方支付
    try {
      const paymentResult = await paymentGateway.process({
        amount: order.totalAmount,
        currency: order.currency,
        paymentMethod,
        orderId
      }, { timeout: 15000, retries: 2 });

      // 6. 更新订单和支付状态
      await tx.orders.update({
        where: { id: orderId },
        data: { status: 'paid' }
      });

      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          externalId: paymentResult.externalId
        }
      });

      return { success: true, paymentId: payment.id };

    } catch (error) {
      // 支付失败，回滚库存（由外层事务处理）
      await tx.payments.update({
        where: { id: payment.id },
        data: { status: 'failed' }
      });
      throw error;
    }
  });
}
```

### 6. 外部 API 调用

```python
# 调用第三方支付 API
# API 文档: https://docs.payment-provider.com/api
# 注意事项:
#   - 请求超时设置为 30 秒
#   - 失败重试 3 次，指数退避
#   - 需要签名验证，签名算法见: docs/signature.md
def create_payment(amount, order_id):
    # 构建请求参数
    payload = {
        'amount': amount,
        'order_id': order_id,
        'timestamp': int(time.time())
    }

    # 计算签名 - HMAC-SHA256
    # 签名规则: 按 key 排序后拼接，加上 secret
    # ...
```

```typescript
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';

/**
 * 调用第三方短信发送 API
 *
 * API 文档: https://docs.sms-provider.com/api/v2/send
 *
 * 注意事项:
 *   - 请求超时设置为 10 秒（短信发送时效性强）
 *   - 失败重试 2 次，使用指数退避
 *   - 需要签名验证，签名算法见: docs/signature.md
 *   - 每个手机号每分钟最多调用 5 次（限流）
 *   - 短信内容长度不能超过 500 字
 *
 * @param phoneNumber - 手机号，E.164 格式，如 +8613800138000
 * @param templateId - 短信模板 ID
 * @param params - 模板参数，键值对
 * @returns 发送结果，包含消息 ID
 *
 * @throws {SmsRateLimitError} 触发流量限制时抛出
 * @throws {SmsInvalidPhoneError} 手机号格式错误时抛出
 * @throws {SmsApiError} 其他 API 错误时抛出
 */
async function sendSms(
  phoneNumber: string,
  templateId: string,
  params: Record<string, string>
): Promise<SmsSendResult> {
  // 验证手机号格式
  if (!isValidE164Phone(phoneNumber)) {
    throw new SmsInvalidPhoneError('手机号格式不正确');
  }

  // 检查本地限流
  const rateLimiter = getSmsRateLimiter();
  if (!rateLimiter.allow(phoneNumber)) {
    throw new SmsRateLimitError('调用过于频繁，请稍后再试');
  }

  // 构建请求参数
  const payload = {
    phone: phoneNumber,
    templateId,
    params,
    timestamp: Date.now()
  };

  // 计算签名 - HMAC-SHA256
  // 签名规则:
  //   1. 按 key 字母序排序所有参数
  //   2. 拼接成 key1=value1&key2=value2 格式
  //   3. 加上 &secret=API_SECRET
  //   4. 计算 HMAC-SHA256 哈希，转为十六进制
  const sortedKeys = Object.keys(payload).sort();
  const signString = sortedKeys
    .map(key => `${key}=${payload[key as keyof typeof payload]}`)
    .join('&') + `&secret=${SMS_API_SECRET}`;

  const signature = crypto
    .createHmac('sha256', SMS_API_SECRET)
    .update(signString)
    .digest('hex');

  try {
    // 发送请求
    const response = await axios.post(SMS_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-API-Key': SMS_API_KEY
      },
      timeout: 10000,  // 10 秒超时
      // 配置重试策略
      'axios-retry': {
        retries: 2,
        retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000,  // 指数退避
        retryCondition: (error: AxiosError) => {
          // 只重试网络错误和 5xx 错误
          return !error.response || error.response.status >= 500;
        }
      }
    });

    return {
      success: true,
      messageId: response.data.messageId
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response) {
        // 处理 API 返回的错误
        switch (response.data?.code) {
          case 'RATE_LIMIT_EXCEEDED':
            throw new SmsRateLimitError(response.data.message);
          case 'INVALID_PHONE':
            throw new SmsInvalidPhoneError(response.data.message);
          default:
            throw new SmsApiError(
              response.data?.message || '短信发送失败',
              response.data?.code
            );
        }
      }
    }
    // 网络错误等
    throw new SmsApiError('网络错误，请稍后重试');
  }
}
```

### 7. 不易理解的代码

```python
# 位运算优化 - 使用位图存储用户权限
# 每个权限占一位，例如:
#   0b0001 = 读权限
#   0b0010 = 写权限
#   0b0100 = 删除权限
#   0b1000 = 管理权限
# 这样可以用一个整数存储多个权限，且位运算非常快
def has_permission(user_perms, required_perm):
    return (user_perms & required_perm) != 0
```

```typescript
/**
 * 使用位运算优化的用户权限检查
 *
 * 为什么使用位运算：
 *   - 空间效率：一个数字可以存储 31 个权限（JS 的位运算使用 32 位有符号整数）
 *   - 性能：位运算是 CPU 原生指令，速度极快
 *   - 简化逻辑：权限组合和检查都可以通过简单的位运算实现
 *
 * 权限定义（每个权限占一位）：
 *   0b00000001 (1) = 读权限 (READ)
 *   0b00000010 (2) = 写权限 (WRITE)
 *   0b00000100 (4) = 删除权限 (DELETE)
 *   0b00001000 (8) = 管理权限 (ADMIN)
 *   0b00010000 (16) = 审核权限 (AUDIT)
 *   ... 可以继续扩展到 31 个权限
 *
 * 使用示例：
 *   const userPermissions = Permission.READ | Permission.WRITE;  // 用户有读写权限
 *   if (hasPermission(userPermissions, Permission.DELETE)) { ... }  // 检查删除权限
 */

// 权限枚举，使用位移运算符定义
export enum Permission {
  READ = 1 << 0,     // 1 = 0b00000001
  WRITE = 1 << 1,    // 2 = 0b00000010
  DELETE = 1 << 2,   // 4 = 0b00000100
  ADMIN = 1 << 3,    // 8 = 0b00001000
  AUDIT = 1 << 4,    // 16 = 0b00010000
  EXPORT = 1 << 5,   // 32 = 0b00100000
  IMPORT = 1 << 6,   // 64 = 0b01000000
}

/**
 * 检查用户是否拥有指定权限
 *
 * @param userPermissions - 用户的权限集合（位掩码）
 * @param requiredPermission - 需要检查的权限
 * @returns 是否拥有该权限
 *
 * 位运算说明：
 *   & 按位与运算：只有两个位都为 1 时结果为 1
 *   如果用户拥有该权限，userPermissions 中对应的位是 1
 *   与 requiredPermission 进行 & 运算后，结果非零表示有权限
 */
export function hasPermission(
  userPermissions: number,
  requiredPermission: Permission
): boolean {
  return (userPermissions & requiredPermission) !== 0;
}

/**
 * 检查用户是否拥有所有指定权限
 *
 * @param userPermissions - 用户的权限集合
 * @param requiredPermissions - 需要的多个权限
 * @returns 是否拥有所有权限
 *
 * 使用场景：需要多个权限同时满足时，例如"删除文章需要写权限和删除权限"
 */
export function hasAllPermissions(
  userPermissions: number,
  requiredPermissions: Permission[]
): boolean {
  // 先将所有需要的权限用 | 运算组合起来
  const combined = requiredPermissions.reduce((acc, p) => acc | p, 0);
  // 然后检查用户权限是否包含所有这些位
  return (userPermissions & combined) === combined;
}

/**
 * 为用户添加权限
 *
 * @param userPermissions - 用户当前的权限集合
 * @param permissionToAdd - 要添加的权限
 * @returns 新的权限集合
 *
 * | 按位或运算：只要有一个位为 1，结果就是 1
 * 这样可以安全地添加权限，即使该权限已经存在也不会有问题
 */
export function addPermission(
  userPermissions: number,
  permissionToAdd: Permission
): number {
  return userPermissions | permissionToAdd;
}

/**
 * 移除用户的某个权限
 *
 * @param userPermissions - 用户当前的权限集合
 * @param permissionToRemove - 要移除的权限
 * @returns 新的权限集合
 *
 * ~ 按位非运算：将所有位取反
 * & 按位与运算：只有两个位都为 1 时结果才为 1
 * 组合使用这两个运算可以精确地移除某个权限
 * 相当于：保留除了要移除的权限之外的所有权限
 */
export function removePermission(
  userPermissions: number,
  permissionToRemove: Permission
): number {
  return userPermissions & ~permissionToRemove;
}
```

## 注释样式

### Python
使用 docstring 和行内注释结合：

```python
"""模块文档字符串"""

def function():
    """函数文档字符串"""
    # 行内注释
    pass
```

### JavaScript/TypeScript

使用 JSDoc 和行内注释：

```javascript
/**
 * 函数描述
 * @param {Type} param - 参数描述
 * @returns {Type} 返回值描述
 */
function func(param) {
    // 行内注释
}
```

#### 完整的 JSDoc 示例

```typescript
/**
 * 用户服务类 - 处理用户相关的所有业务逻辑
 *
 * @description
 * 这个类封装了用户管理的核心功能，包括：
 * - 用户创建和验证
 * - 密码加密和验证
 * - 用户信息更新
 * - 用户状态管理
 *
 * @example
 * ```typescript
 * const userService = new UserService(database, emailService);
 * const user = await userService.createUser({
 *   email: 'user@example.com',
 *   name: '张三',
 *   password: 'securePassword123'
 * });
 * ```
 */
class UserService {
  private db: Database;
  private emailService: EmailService;

  /**
   * 创建用户服务实例
   *
   * @param db - 数据库连接实例
   * @param emailService - 邮件服务实例
   */
  constructor(db: Database, emailService: EmailService) {
    this.db = db;
    this.emailService = emailService;
  }

  /**
   * 创建新用户
   *
   * @param data - 用户数据
   * @param data.email - 用户邮箱（必须唯一）
   * @param data.name - 用户姓名
   * @param data.password - 密码（至少 8 位）
   * @param data.role - 用户角色，默认为 'user'
   *
   * @returns 创建的用户对象
   *
   * @throws {ValidationError} 当数据验证失败时
   * @throws {DuplicateEmailError} 当邮箱已存在时
   * @throws {DatabaseError} 当数据库操作失败时
   *
   * @async
   */
  async createUser(
    data: CreateUserData
  ): Promise<User> {
    // 实现...
  }

  /**
   * 根据 ID 获取用户
   *
   * @param userId - 用户 ID
   * @returns 用户对象，如果不存在则返回 null
   *
   * @template T - 返回值的类型
   * @param includeDeleted - 是否包含已删除的用户，默认为 false
   */
  async getUserById<T extends User | null = User | null>(
    userId: string,
    includeDeleted: boolean = false
  ): Promise<T> {
    // 实现...
  }

  /**
   * 批量更新用户状态
   *
   * @param userIds - 用户 ID 数组
   * @param status - 新的用户状态
   *
   * @returns 更新的用户数量
   *
   * @deprecated 使用 updateUsers 方法替代，该方法将在 v2.0 中移除
   */
  async updateUserStatus(
    userIds: string[],
    status: UserStatus
  ): Promise<number> {
    // 实现...
  }
}
```

#### TypeScript 特定注释

```typescript
/**
 * 用户接口 - 定义用户数据结构
 */
interface User {
  /** 用户唯一标识 */
  id: string;
  /** 用户邮箱 */
  email: string;
  /** 用户姓名 */
  name: string;
  /** 用户角色 */
  role: 'admin' | 'user' | 'guest';
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 创建用户的数据类型
 * @extends Partial<User> - 继承自 User，但 id 和 createdAt 是可选的
 */
type CreateUserData = Omit<User, 'id' | 'createdAt'> & {
  password: string;
};

/**
 * 用户状态枚举
 */
enum UserStatus {
  /** 活跃状态 */
  ACTIVE = 'active',
  /** 禁用状态 */
  DISABLED = 'disabled',
  /** 待验证 */
  PENDING = 'pending'
}

/**
 * 泛型响应类型
 * @template T - 数据的类型
 */
interface ApiResponse<T> {
  /** 响应状态 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * 高阶函数 - 创建带缓存的函数
 *
 * @template T - 原始函数的类型
 * @template K - 缓存键的类型
 *
 * @param fn - 要缓存的函数
 * @param keyFn - 生成缓存键的函数
 * @param ttl - 缓存过期时间（毫秒）
 *
 * @returns 带缓存的函数
 */
function withCache<T extends (...args: any[]) => any, K = string>(
  fn: T,
  keyFn: (...args: Parameters<T>) => K,
  ttl: number = 300000
): (...args: Parameters<T>) => ReturnType<T> {
  // 实现...
}
```

#### Node.js 特定注释

```javascript
/**
 * Express 中间件 - 用户身份验证
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 *
 * @description
 * 这个中间件负责：
 * 1. 从请求头中提取 JWT token
 * 2. 验证 token 的有效性
 * 3. 将用户信息附加到 req.user
 * 4. 处理认证失败的情况
 *
 * @example
 * ```javascript
 * // 在路由中使用
 * app.get('/api/profile', authenticate, (req, res) => {
 *   res.json(req.user);
 * });
 * ```
 *
 * @middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // 检查 Authorization 头是否存在
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: '未提供认证令牌'
    });
  }

  const token = authHeader.slice(7);

  try {
    // 验证 JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: '无效的认证令牌'
    });
  }
}

/**
 * EventEmitter 示例 - 任务队列
 *
 * @fires TaskQueue#task:added - 当添加新任务时触发
 * @fires TaskQueue#task:completed - 当任务完成时触发
 * @fires TaskQueue#task:failed - 当任务失败时触发
 * @fires TaskQueue#drain - 当队列为空时触发
 */
class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.tasks = [];
  }

  /**
   * 添加任务到队列
   * @param task - 任务对象
   * @emits TaskQueue#task:added
   */
  addTask(task) {
    this.tasks.push(task);
    this.emit('task:added', task);
  }
}

/**
 * 任务添加事件
 * @event TaskQueue#task:added
 * @type {object}
 * @property {string} taskId - 任务 ID
 * @property {string} type - 任务类型
 */

/**
 * 模块导出 - CommonJS 风格
 * @module user-service
 */
module.exports = {
  UserService,
  authenticate,
  TaskQueue
};

// ES Module 导出
// export { UserService, authenticate, TaskQueue };
```

#### React/JSX 注释示例

```tsx
import React, { useState, useEffect, useCallback } from 'react';

/**
 * 用户卡片组件 - 显示用户基本信息
 *
 * @component
 * @param props - 组件属性
 * @param props.user - 用户对象
 * @param props.onEdit - 编辑按钮点击回调
 * @param props.onDelete - 删除按钮点击回调
 * @param props.className - 自定义 CSS 类名
 *
 * @example
 * ```tsx
 * <UserCard
 *   user={currentUser}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
function UserCard({
  user,
  onEdit,
  onDelete,
  className = ''
}: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * 切换展开状态
   * @callback
   */
  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  /**
   * 获取用户角色对应的颜色
   * @param role - 用户角色
   * @returns 颜色值
   */
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#f44336';
      case 'user':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div className={`user-card ${className}`}>
      <div className="user-header">
        <img
          src={user.avatar}
          alt={`${user.name} 的头像`}
          className="user-avatar"
        />
        <div className="user-info">
          <h3>{user.name}</h3>
          <span
            className="user-role"
            style={{ color: getRoleColor(user.role) }}
          >
            {user.role}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="user-details">
          <p>邮箱: {user.email}</p>
          <p>创建时间: {formatDate(user.createdAt)}</p>
        </div>
      )}

      <div className="user-actions">
        <button onClick={toggleExpand}>
          {isExpanded ? '收起' : '展开详情'}
        </button>
        <button onClick={() => onEdit(user)}>编辑</button>
        <button onClick={() => onDelete(user.id)}>删除</button>
      </div>
    </div>
  );
}

/**
 * 用户卡片组件属性类型
 */
interface UserCardProps {
  /** 用户对象 */
  user: User;
  /** 编辑回调 */
  onEdit: (user: User) => void;
  /** 删除回调 */
  onDelete: (userId: string) => void;
  /** 自定义类名 */
  className?: string;
}

export default UserCard;
```

### Java/C++
使用 JavaDoc 和行内注释：

```java
/**
 * 类描述
 */
public class MyClass {
    /**
     * 方法描述
     * @param param 参数描述
     * @return 返回值描述
     */
    public ReturnType method(ParamType param) {
        // 行内注释
    }
}
```

### Go
使用 Go Doc 和行内注释：

```go
// Package mypkg 包描述
package mypkg

// MyFunc 函数描述
// 参数: param - 参数描述
// 返回: 返回值描述
func MyFunc(param ParamType) ReturnType {
    // 行内注释
}
```

## 避免的注释

1. **不要注释显而易见的代码**
   ```python
   # 不好的注释
   x = x + 1  # x 加 1
   ```

2. **不要用注释代替好的命名**
   ```python
   # 不好
   d = 7  # 天数
   
   # 好
   days = 7
   ```

3. **不要保留注释掉的代码** - 用 Git 记录历史

4. **不要写谎言** - 注释必须与代码一致
