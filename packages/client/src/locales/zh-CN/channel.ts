export default {
  google: {
    title: "Google登录配置",
    saveConfig: "保存配置",
    alert: {
      title: "请先前往 Google Cloud Console 申请 OAuth 2.0 客户端ID",
      linkText: "前往 Google Cloud Console",
    },
    oauthConfig: {
      title: "Google OAuth 配置",
      description:
        "登录 Google Cloud Console，点击 APIs & Services > Credentials，创建 OAuth 2.0 Client ID",
    },
    callbackUrl: {
      label: "回调地址",
      description:
        "登录 Google Cloud Console，在 OAuth 2.0 Client ID 的已授权重定向 URI 中添加以下地址",
      copyButton: "复制回调地址",
    },
    clientId: {
      label: "Client ID",
      placeholder: "粘贴 Google Client ID",
      required: "请填写 Client ID",
    },
    clientSecret: {
      label: "Client Secret",
      placeholder: "粘贴 Google Client Secret",
      required: "请填写 Client Secret",
    },
    saveSuccess: "保存成功",
    saveFailed: "保存失败: {message}",
    copied: "已复制",
  },
  wechatOA: {
    title: "微信公众号配置",
    saveConfig: "保存配置",
    messageEncrypt: {
      plain: "明文模式",
      compatible: "兼容模式",
      safe: "安全模式",
    },
    toast: {
      saveSuccess: "保存成功",
      saveFailed: "保存失败: {message}",
      copied: "已复制",
      copyFailed: "复制失败",
    },
    alert: {
      title: "请先前往微信公众号后台申请认证微信公众号-服务号",
      linkText: "前往微信公众号后台",
    },
    developerInfo: {
      title: "公众号开发者信息",
      description: "登录微信公众平台，点击开发>基本配置>公众号开发信息，设置AppID和AppSecret",
      appId: "AppID",
      appIdPlaceholder: "粘贴微信公众号 AppID",
      appSecret: "AppSecret",
      appSecretPlaceholder: "粘贴微信公众号 AppSecret",
    },
    serverConfig: {
      title: "服务器配置",
      url: "URL",
      urlDescription: "登录微信公众平台，点击开发>基本配置>服务器配置，填写上述服务器地址（URL）",
      urlPlaceholder: "由系统根据 APP_DOMAIN 生成",
      token: "Token",
      tokenDescription: "登录微信公众平台，点击开发>基本配置>服务器配置，设置令牌 Token",
      tokenPlaceholder: "服务器配置令牌 Token",
      encodingAESKey: "EncodingAESKey",
      encodingAESKeyDescription: "消息加密密钥由43位字符组成，字符范围为 A-Z, a-z, 0-9",
      encodingAESKeyPlaceholder: "43位字符，范围 A-Z, a-z, 0-9",
      messageEncryptType: "消息加密方式",
      copyUrl: "复制 URL",
    },
    featureSettings: {
      title: "功能设置",
      businessDomain: "业务域名",
      businessDomainDescription: "登录微信公众平台，点击设置>公众号设置>功能设置，填写业务域名",
      businessDomainPlaceholder: "由系统根据 APP_DOMAIN 生成",
      copyBusinessDomain: "复制业务域名",
      jsApiDomain: "JS接口安全域名",
      jsApiDomainDescription: "登录微信公众平台，点击设置>公众号设置>功能设置，填写JS接口安全域名",
      jsApiDomainPlaceholder: "由系统根据 APP_DOMAIN 生成",
      copyJsApiDomain: "复制 JS 接口安全域名",
      webAuthDomain: "网页授权域名",
      webAuthDomainDescription: "登录微信公众平台，点击设置>公众号设置>功能设置，填写网页授权域名",
      webAuthDomainPlaceholder: "由系统根据 APP_DOMAIN 生成",
      copyWebAuthDomain: "复制网页授权域名",
    },
    validation: {
      appIdRequired: "请填写 AppID",
      appSecretRequired: "请填写 AppSecret",
    },
  },
};
