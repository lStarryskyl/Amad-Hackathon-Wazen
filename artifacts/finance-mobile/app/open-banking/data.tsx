import EducationScreen from "@/components/EducationScreen";

export default function WhatDataScreen() {
  return (
    <EducationScreen
      step={2}
      totalSteps={3}
      heroIcon="database"
      title="What Wazen Can See"
      subtitle="Only the information needed to give you useful insights — nothing more."
      cards={[
        {
          icon: "credit-card",
          title: "Account balances",
          body: "Your current balances, so Wazen can show your full financial picture in one place.",
        },
        {
          icon: "list",
          title: "Transaction history",
          body: "Where your money comes from and where it goes — this powers spending insights, patterns, and forecasts.",
        },
        {
          icon: "user",
          title: "Basic account details",
          body: "The account name and type (like checking or savings), so everything is labeled clearly in the app.",
        },
        {
          icon: "x-circle",
          title: "What Wazen never gets",
          body: "Your bank login, your PIN, or the ability to move money. Your data is encrypted and never sold to anyone.",
          tone: "warning",
        },
      ]}
      nextHref="/open-banking/control"
    />
  );
}
