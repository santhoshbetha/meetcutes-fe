import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

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
      <div className="mt-1 flex justify-center">
        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {Math.round(currentValue)}
        </span>
      </div>
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
          {section.questions.map((question) => (
            <QuestionSlider
              key={question.key}
              question={question}
              value={values[question.key]}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default QuestionnaireSection;
