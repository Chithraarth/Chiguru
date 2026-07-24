import { useState } from "react";
import { Users, Camera, BookOpen, Volume2, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { speak } from "@/lib/i18n-data";

interface GuidedTourProps {
  onClose: () => void;
}

export function GuidedTour({ onClose }: GuidedTourProps) {
  const { t, lang } = useT();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Users,
      circle: "bg-primary/10 text-primary",
      title: t("tour.step1Title"),
      body: t("tour.step1Body"),
    },
    {
      icon: Camera,
      circle: "bg-primary/10 text-primary",
      title: t("tour.step2Title"),
      body: t("tour.step2Body"),
    },
    {
      icon: BookOpen,
      circle: "bg-primary/10 text-primary",
      title: t("tour.step3Title"),
      body: t("tour.step3Body"),
    },
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = cur.icon;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-primary/10 via-background to-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <p className="text-sm font-bold text-primary uppercase tracking-wide">
          {t("tour.welcome")}
        </p>
        <button onClick={onClose} aria-label={t("tour.skip")} className="text-gray-400 p-2 -mr-2">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Progress bars */}
      <div className="flex gap-2 px-5 mt-3">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full flex-1 transition-all ${i <= step ? "bg-primary" : "bg-gray-200"}`}
          />
        ))}
      </div>

      {/* Current step — big and clear */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className={`rounded-full p-8 ${cur.circle} mb-6`}>
          <Icon className="h-16 w-16" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 leading-snug">{cur.title}</h2>
        <p className="text-base text-gray-600 mt-3 leading-relaxed max-w-xs">{cur.body}</p>
        <button
          onClick={() => speak(`${cur.title}. ${cur.body}`, lang)}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary active:bg-primary/20"
        >
          <Volume2 className="h-5 w-5" />
          {t("home.listen")}
        </button>
      </div>

      {/* The whole journey, always visible: 1 → 2 → 3 */}
      <div className="flex items-center justify-center gap-1 px-5 pb-4">
        {steps.map((s, i) => {
          const SIcon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center">
              {i > 0 && <div className={`w-6 h-0.5 mx-1 ${i <= step ? "bg-primary" : "bg-gray-200"}`} />}
              <div
                className={`rounded-2xl p-3 border-2 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-gray-200 bg-white text-gray-300"
                }`}
              >
                {done ? <Check className="h-6 w-6" /> : <SIcon className="h-6 w-6" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 pt-1">
        {!isLast ? (
          <>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full rounded-2xl h-14 bg-primary text-primary-foreground text-lg font-semibold active:bg-primary/90"
            >
              {t("tour.next")} →
            </button>
            <button onClick={onClose} className="w-full h-11 mt-1 text-gray-400 text-sm font-medium">
              {t("tour.skip")}
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            className="w-full rounded-2xl h-14 bg-primary text-primary-foreground text-lg font-semibold active:bg-primary/90"
          >
            {t("tour.start")} →
          </button>
        )}
      </div>
    </div>
  );
}
