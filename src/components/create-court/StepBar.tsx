interface StepBarProps {
  currentStep: number;
  totalSteps: number;
  color: string;
}

export default function StepBar({ currentStep, totalSteps, color }: StepBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            width: i === currentStep - 1 ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            backgroundColor: i < currentStep ? color : '#D1D5DB',
          }}
        />
      ))}
    </div>
  );
}
