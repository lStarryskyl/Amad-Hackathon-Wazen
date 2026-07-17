import EducationScreen from "@/components/EducationScreen";

export default function YouAreInControlScreen() {
  return (
    <EducationScreen
      step={3}
      totalSteps={3}
      heroIcon="sliders"
      title="You're in Control"
      subtitle="Sharing your data is always your choice — and you can change your mind at any time."
      cards={[
        {
          icon: "check-circle",
          title: "You choose what to connect",
          body: "Nothing is shared until you say so. You pick which accounts to connect, and you can skip any of them.",
        },
        {
          icon: "x-octagon",
          title: "Disconnect anytime",
          body: "You can revoke Wazen's access whenever you like — from the app or directly through your bank. Access stops immediately.",
          tone: "warning",
        },
        {
          icon: "trash-2",
          title: "Delete your data",
          body: "Want a clean slate? You can ask Wazen to erase everything it holds about you, permanently.",
        },
        {
          icon: "refresh-cw",
          title: "Access expires on its own",
          body: "Connections aren't forever. Banks require you to renew your permission regularly, so access never quietly lingers.",
          tone: "accent",
        },
      ]}
      footnote="Your data works for you — never the other way around."
    />
  );
}
