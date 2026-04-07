export default {
  sms: {
    aliyun: "阿里云",
    tencent: "腾讯云",
  },
  notificationSettings: {
    title: "通知设置",
    table: {
      scene: "通知场景",
      type: "通知类型",
      smsNotification: "短信通知",
      actions: "操作",
      loading: "加载中...",
      noData: "暂无通知场景配置",
    },
    status: {
      enabled: "开启",
      disabled: "关闭",
    },
    button: {
      settings: "设置",
    },
    dialog: {
      title: "短信通知设置",
      enableStatus: "开启状态",
      templateId: "模板ID",
      smsContent: "短信内容",
      placeholder: {
        templateId: "例如：SMS_222458159",
        content: "请输入短信内容，支持变量 ${code}",
      },
      hint: {
        variables: "可选变量：验证码变量 ${code}。示例：您正在登录，验证码 ${code}，5分钟内有效。",
      },
      cancel: "取消",
      save: "保存",
    },
    toast: {
      updated: "通知场景配置已更新",
      updateFailed: "更新通知场景配置失败",
    },
  },
  aliyunSms: {
    title: "阿里云短信",
    enabled: "已启用",
    enable: "启用",
    sign: "短信签名",
    accessKeyId: "AccessKey ID",
    accessKeySecret: "AccessKey Secret",
    saveSettings: "保存设置",
    resetSettings: "重置设置",
    notificationSettings: "通知设置",
    toast: {
      enabled: "阿里云短信已启用",
      enableFailed: "启用阿里云短信失败",
      saved: "阿里云短信配置已保存",
      saveFailed: "保存阿里云短信配置失败",
    },
    validation: {
      signRequired: "请输入短信签名",
      accessKeyIdRequired: "请输入阿里云accessKey ID",
      accessKeySecretRequired: "请输入阿里云AccessKey Secret",
    },
  },
  tencentSms: {
    title: "腾讯云短信",
    enabled: "已启用",
    enable: "启用",
    sign: "短信签名",
    appId: "APP_ID",
    secretId: "SECRET_ID",
    secretKey: "SECRET_KEY",
    saveSettings: "保存设置",
    resetSettings: "重置设置",
    notificationSettings: "通知设置",
    toast: {
      enabled: "腾讯云短信已启用",
      enableFailed: "启用腾讯云短信失败",
      saved: "腾讯云短信配置已保存",
      saveFailed: "保存腾讯云短信配置失败",
    },
    validation: {
      signRequired: "请输入短信签名",
      appIdRequired: "请输入腾讯云 APP KEY",
      secretIdRequired: "请输入腾讯云 SECRET ID",
      secretKeyRequired: "请输入腾讯云 SECRET KEY",
    },
  },
};
