"use client";

import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { useI18n } from "@buildingai/i18n";
import { useMembershipPayResultQuery, useRechargePayResultQuery } from "@buildingai/services/web";
import { Loader } from "@buildingai/ui/components/loader";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const PAYMENT_SUCCESS_MESSAGE_TYPE = "buildingai:alipay-payment-success";
const RETURN_STATUS = "success";

/**
 * Payment return bridge page for Alipay web payments.
 * It keeps polling the payment status and notifies the opener when the order is paid.
 */
export default function AlipayReturnPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const hasNotifiedRef = useRef(false);

  const payFrom = searchParams.get("payFrom");
  const orderId = searchParams.get("payOrderId") ?? "";
  const orderNo = searchParams.get("payOrderNo") ?? "";
  const payType = searchParams.get("payType") ?? String(PayConfigPayType.ALIPAY);
  const isRecharge = payFrom === "recharge";
  const isMembership = payFrom === "membership";

  const rechargeQuery = useRechargePayResultQuery(orderId, {
    enabled: isRecharge && !!orderId,
    refetchInterval: (query) => {
      const isPaid = query.state.data?.payStatus === 1 || query.state.data?.payState === 1;
      return isPaid ? false : 2000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

  const membershipQuery = useMembershipPayResultQuery(orderId, {
    enabled: isMembership && !!orderId,
    refetchInterval: (query) => {
      const isPaid = query.state.data?.payStatus === 1 || query.state.data?.payState === 1;
      return isPaid ? false : 2000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

  const payResult = useMemo(() => {
    if (isRecharge) return rechargeQuery.data;
    if (isMembership) return membershipQuery.data;
    return undefined;
  }, [isMembership, isRecharge, membershipQuery.data, rechargeQuery.data]);
  const isPaid = payResult?.payStatus === 1 || payResult?.payState === 1;

  useEffect(() => {
    if (hasNotifiedRef.current || !isPaid) return;
    if (typeof window === "undefined") return;

    hasNotifiedRef.current = true;
    const message = {
      type: PAYMENT_SUCCESS_MESSAGE_TYPE,
      payFrom,
      payType,
      orderId,
      orderNo,
      status: RETURN_STATUS,
    };

    try {
      window.opener?.postMessage(message, window.location.origin);
      window.opener?.focus?.();
    } catch (error) {
      console.error("Failed to notify opener about Alipay success:", error);
    }

    window.setTimeout(() => {
      window.close();
    }, 200);
  }, [isPaid, orderId, orderNo, payFrom, payType]);

  const description = !payFrom
    ? t("payment.confirmingPayment")
    : isPaid
      ? t("payment.paymentSuccess")
      : isRecharge
        ? t("payment.confirmingRecharge")
        : t("payment.confirmingMembership");

  const isInvalid = !payFrom || !orderId || payType !== String(PayConfigPayType.ALIPAY);

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
      <div className="bg-card text-card-foreground flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border p-6 shadow-sm">
        <Loader className="text-primary size-10" />
        <div className="space-y-2 text-center">
          <p className="text-base font-medium">
            {isInvalid ? t("payment.paymentParamsError") : description}
          </p>
          <p className="text-muted-foreground text-sm">
            {isInvalid ? t("payment.returnToSystem") : t("payment.doNotClose")}
          </p>
        </div>
        {isPaid && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {t("payment.paymentSuccess2")}
          </p>
        )}
      </div>
    </div>
  );
}
