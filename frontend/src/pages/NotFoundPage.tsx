import FuzzyText from "@/components/FuzzyText";
export default function NotFoundPage() {
  return (
    <div className="flex justify-center">
      <FuzzyText
        baseIntensity={0.2}
        hoverIntensity={0.5}
        color={"#000000"}
        enableHover
      >
        404
      </FuzzyText>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/dashboard">Go back to Dashboard</a>
    </div>
  );
}
