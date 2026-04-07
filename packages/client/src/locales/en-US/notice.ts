export default {
  sms: {
    aliyun: "Aliyun",
    tencent: "Tencent",
  },
  notificationSettings: {
    title: "Notification Settings",
    table: {
      scene: "Notification Scene",
      type: "Notification Type",
      smsNotification: "SMS Notification",
      actions: "Actions",
      loading: "Loading...",
      noData: "No notification scene configuration",
    },
    status: {
      enabled: "Enabled",
      disabled: "Disabled",
    },
    button: {
      settings: "Settings",
    },
    dialog: {
      title: "SMS Notification Settings",
      enableStatus: "Enable Status",
      templateId: "Template ID",
      smsContent: "SMS Content",
      placeholder: {
        templateId: "e.g. SMS_222458159",
        content: "Enter SMS content, supports variable ${code}",
      },
      hint: {
        variables:
          "Optional variables: verification code variable ${code}. Example: You are logging in, verification code ${code}, valid for 5 minutes.",
      },
      cancel: "Cancel",
      save: "Save",
    },
    toast: {
      updated: "Notification scene configuration updated",
      updateFailed: "Failed to update notification scene configuration",
    },
  },
  aliyunSms: {
    title: "Aliyun SMS",
    enabled: "Enabled",
    enable: "Enable",
    sign: "SMS Signature",
    accessKeyId: "AccessKey ID",
    accessKeySecret: "AccessKey Secret",
    saveSettings: "Save Settings",
    resetSettings: "Reset Settings",
    notificationSettings: "Notification Settings",
    toast: {
      enabled: "Aliyun SMS enabled",
      enableFailed: "Failed to enable Aliyun SMS",
      saved: "Aliyun SMS configuration saved",
      saveFailed: "Failed to save Aliyun SMS configuration",
    },
    validation: {
      signRequired: "Please enter SMS signature",
      accessKeyIdRequired: "Please enter Aliyun AccessKey ID",
      accessKeySecretRequired: "Please enter Aliyun AccessKey Secret",
    },
  },
  tencentSms: {
    title: "Tencent SMS",
    enabled: "Enabled",
    enable: "Enable",
    sign: "SMS Signature",
    appId: "APP_ID",
    secretId: "SECRET_ID",
    secretKey: "SECRET_KEY",
    saveSettings: "Save Settings",
    resetSettings: "Reset Settings",
    notificationSettings: "Notification Settings",
    toast: {
      enabled: "Tencent SMS enabled",
      enableFailed: "Failed to enable Tencent SMS",
      saved: "Tencent SMS configuration saved",
      saveFailed: "Failed to save Tencent SMS configuration",
    },
    validation: {
      signRequired: "Please enter SMS signature",
      appIdRequired: "Please enter Tencent Cloud APP KEY",
      secretIdRequired: "Please enter Tencent Cloud SECRET ID",
      secretKeyRequired: "Please enter Tencent Cloud SECRET KEY",
    },
  },
};
