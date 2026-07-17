import EducationScreen from "@/components/EducationScreen";

export default function WhatIsOpenBankingScreen() {
  return (
    <EducationScreen
      step={1}
      totalSteps={3}
      heroIcon="link"
      title="What Is Open Banking?"
      subtitle="A safe, regulated way to let apps like Wazen see your finances — without ever handing over your bank password."
      cards={[
        {
          icon: "shield",
          title: "Built on regulation",
          body: "Open banking exists because of laws that require banks to give you control over your own data. It's not a workaround — it's the official, supervised way.",
        },
        {
          icon: "key",
          title: "Your password stays with your bank",
          body: "You log in on your bank's own page. Wazen never sees or stores your banking credentials.",
          tone: "accent",
        },
        {
          icon: "eye",
          title: "Read-only by design",
          body: "Wazen can look at your data to help you understand it. It cannot move money, make payments, or change anything in your account.",
        },
      ]}
      footnote="Think of it like showing someone your bank statement — not giving them your wallet."
      nextHref="/open-banking/data"
    />
  );
}
