import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function leaningLabel(value) {
  const rounded = Math.round(Number(value) || 0);

  if (rounded <= 15) return "Strongly lean left";
  if (rounded <= 40) return "Slightly lean left";
  if (rounded <= 59) return "Neutral / Balanced";
  if (rounded <= 84) return "Slightly lean right";
  return "Strongly lean right";
}

function QuestionSlider({ question, value, onChange, disabled }) {
  const currentValue = Number.isFinite(Number(value))
    ? Number(value)
    : question.defaultValue;

  return (
    <div data-testid={`questionnaire-question-${question.key}`}>
      <div className="grid grid-cols-12 items-center gap-2">
        <span className="col-span-3 text-sm font-medium text-foreground/80 sm:col-span-2">
          {question.left}
        </span>
        <span className="col-span-6 sm:col-span-8">
          <Slider
            aria-label={`${question.left} to ${question.right}`}
            value={[currentValue]}
            onValueChange={(nextValues) =>
              onChange(question.key, nextValues[0])
            }
            min={question.min}
            max={question.max}
            step={question.step}
            disabled={disabled}
          />
        </span>
        <span className="col-span-3 text-right text-sm font-medium text-foreground/80 sm:col-span-2">
          {question.right}
        </span>
      </div>
      <p className="text-xs text-muted-foreground/80 font-medium italic mt-1 text-center block">
        {leaningLabel(currentValue)}
      </p>
    </div>
  );
}

/**
 * Renders one metadata-driven questionnaire section.
 *
 * Every section gets the same glassmorphic shell. Appending questions to a
 * section's config is enough for them to appear here automatically.
 */
export function QuestionnaireSection({
  section,
  values,
  onChange,
  disabled = false,
}) {
  const questionCount = section.questions?.length ?? 0;

  return (
    <section
      data-testid={`questionnaire-section-${section.id}`}
      className="bg-card/40 backdrop-blur-md border border-muted/40 shadow-xs rounded-2xl p-6 mb-6"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {section.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {section.description}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-primary">
          {questionCount} {questionCount === 1 ? "question" : "questions"}
        </Badge>
      </header>

      {questionCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          New questions will render here automatically as they are added to this
          section&apos;s configuration.
        </div>
      ) : (
        <div className="space-y-6">
          {section.questions.map((question) => {
            const currentValue = values[question.key];
            const isSkippedOptional =
              question.optional &&
              (currentValue === null ||
                currentValue === undefined ||
                currentValue === "");

            if (isSkippedOptional) {
              return (
                <div
                  key={question.key}
                  data-testid={`questionnaire-question-${question.key}`}
                >
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-3 text-sm font-medium text-foreground/80 sm:col-span-2">
                      {question.left}
                    </span>
                    <span className="col-span-6 text-center text-xs italic text-muted-foreground sm:col-span-8">
                      Skipped
                    </span>
                    <span className="col-span-3 text-right text-sm font-medium text-foreground/80 sm:col-span-2">
                      {question.right}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onChange(question.key, question.defaultValue ?? 50)
                      }
                    >
                      Answer this question
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={question.key}>
                <QuestionSlider
                  question={question}
                  value={currentValue}
                  onChange={onChange}
                  disabled={disabled}
                />
                {question.optional && (
                  <div className="-mt-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => onChange(question.key, null)}
                    >
                      Skip this question
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default QuestionnaireSection;
