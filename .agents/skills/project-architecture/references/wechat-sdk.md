# @buildingai/wechat-sdk

WeChat integration SDK for Official Account (OA) and Payment.

## Location
`packages/@buildingai/wechat-sdk/`

## Exports
- `WechatOaClient` - WeChat Official Account client
- `WechatPayService` - WeChat Pay service

## WechatOaClient

```typescript
import { WechatOaClient } from "@buildingai/wechat-sdk";

const client = new WechatOaClient(token, encodingAESKey, appId);

// Get access token
const { access_token, expires_in } = await client.getAccessToken(appId, appSecret);

// Generate QR code
const { url, expire_seconds } = await client.getQrCode(access_token, 60, "QR_SCENE", "scene_str");

// Send template message
await client.sendTemplateMessage(access_token, openid, "text", "message content");

// Check signature
const isValid = client.checkSignature(signature, msg_signature, timestamp, nonce, Encrypt);

// Decrypt message
const message = await client.decryptMessage(Encrypt);
```

## WechatPayService

```typescript
import { WechatPayService } from "@buildingai/wechat-sdk";

const payService = new WechatPayService({
    appId: "xxx",
    mchId: "xxx",
    publicKey: "xxx",
    privateKey: "xxx",
    apiSecret: "xxx",
    domain: "https://example.com",
});

// Create native order
const { code_url } = await payService.createNativeOrder({
    out_trade_no: "order123",
    description: "Product",
    amount: { total: 100, currency: "CNY" },
});

// Query order
const order = await payService.queryOrderStatus("order123");

// Close order
await payService.closeOrder("order123");

// Verify payment notification
const isValid = await payService.notifyPay(signParams);

// Decrypt notification body
const data = payService.decryptNotifyBody(resource);

// Refund
await payService.refund({
    out_refund_no: "refund123",
    out_trade_no: "order123",
    amount: { total: 100, refund: 50 },
});

// Query refund
const refund = await payService.queryRefundStatus("refund123");
```
