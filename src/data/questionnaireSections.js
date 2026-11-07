/**
 * Data-driven questionnaire metadata.
 *
 * New psychometric sections only need to be appended to `QUESTIONNAIRE_SECTIONS`
 * (and given questions); the page renders every section and question without
 * touching its layout code.
 */

export const QUESTION_MIN = 0;
export const QUESTION_MAX = 100;
export const QUESTION_STEP = 1;
export const DEFAULT_QUESTION_VALUE = 20;

const BASE_QUESTION = {
  min: QUESTION_MIN,
  max: QUESTION_MAX,
  step: QUESTION_STEP,
  defaultValue: DEFAULT_QUESTION_VALUE,
};

function sharedQuestion(key, left, right) {
  return { ...BASE_QUESTION, key, left, right };
}

function genderedQuestion(key, male, female) {
  return {
    ...BASE_QUESTION,
    key,
    variants: {
      male: { left: male[0], right: male[1] },
      female: { left: female[0], right: female[1] },
    },
  };
}

export const QUESTIONNAIRE_SECTIONS = [
  {
    id: "lifestyle_preferences",
    title: "Core Mindset & Lifestyle",
    description: "Slide options toward the direction your thoughts align.",
    questions: [
      sharedQuestion("q1", "Android", "iPhone"),
      {
        ...sharedQuestion("q2", "Trader Joe's", "ALDI/WINCO"),
        audiences: ["female"],
      },
      genderedQuestion("q3", ["Truck", "BMW"], ["Tesla", "Toyota"]),
      {
        ...sharedQuestion("q4", "Costco", "Whole Foods"),
        audiences: ["female"],
      },
      {
        ...sharedQuestion("q5", "Modern Family", "Traditional Family"),
        audiences: ["male"],
      },
      {
        ...sharedQuestion("q6", "Suit/Formal dress", "Jeans and T-shirt"),
        audiences: ["male"],
      },
      genderedQuestion(
        "q7",
        ["Partner", "Title Wife"],
        ["KOHL'S", "NORDSTROM"],
      ),
      genderedQuestion(
        "q8",
        ["Concerts/Clubs", "Movie at home"],
        ["Enchanted (film)", "Barbie (film)"],
      ),
      genderedQuestion(
        "q9",
        ["End goal Happiness", "End goal Family/kids"],
        ["Power Couple", "Traditional Relationship"],
      ),
      genderedQuestion(
        "q10",
        ["Credit card", "Cash/Debit card"],
        ["Concerts/Clubs", "Movie at home"],
      ),
      {
        ...sharedQuestion("q11", "Title Husband", "Partner"),
        audiences: ["female"],
      },
      {
        ...sharedQuestion(
          "q12",
          "End goal Happiness",
          "End goal Family/kids",
        ),
        audiences: ["female"],
      },
      {
        ...sharedQuestion("q13", "Credit card", "Cash/Debit card"),
        audiences: ["female"],
      },
      {
        ...sharedQuestion("q14", "Dog Mom/Cat Mom", "Pet Owner"),
        audiences: ["female"],
      },
    ],
  },
  {
    id: "optional",
    title: "Optional",
    description:
      "Answer only if you want to. You can skip this question and it will not appear on your profile.",
    questions: [
      {
        ...sharedQuestion("q2_optional", "Capitalism", "Equal Opportunities"),
        audiences: ["male"],
        optional: true,
      },
      {
        ...sharedQuestion("q4_optional", "Socialism", "Pyramid Scheme"),
        audiences: ["male"],
        optional: true,
      },
      {
        ...sharedQuestion("q6_optional", "Pro-Choice", "Pro-Life"),
        audiences: ["female"],
        optional: true,
      },
      // {
      //   ...sharedQuestion("q15_optional", "Capitalism", "Socialism"),
      //   optional: true,
      // },
    ],
  },
  {
    id: "integrity_evaluation",
    title: "Integrity & Principles",
    description: "Scenarios designed to measure accountability and honesty.",
    // Reserved state bucket for the upcoming multiple-choice integrity block.
    valueKey: "integrity",
    questions: [],
  },
  {
    id: "cognitive_empathy",
    title: "Cognitive & Empathy Diagnostics",
    description: "Evaluating perspective-taking and emotional response markers.",
    // Reserved state buckets for the upcoming diagnostic blocks.
    valueKeys: ["cognitive", "empathy"],
    questions: [],
  },
];

/** Maps the profile's free-text gender onto the configured audience key. */
export function resolveAudience(gender) {
  return String(gender ?? "").toLowerCase() === "male" ? "male" : "female";
}

/** Returns the questions visible to one audience, with variants resolved. */
export function getQuestionsForAudience(section, audience) {
  return (section.questions ?? [])
    .filter(
      (question) =>
        !question.audiences || question.audiences.includes(audience),
    )
    .map((question) => {
      if (!question.variants) return question;

      const { variants, ...base } = question;
      return { ...base, ...(variants[audience] ?? variants.male ?? {}) };
    });
}

/** Builds the section tree for the active audience. */
export function resolveQuestionnaireSections(sections, audience) {
  return sections.map((section) => ({
    ...section,
    questions: getQuestionsForAudience(section, audience),
  }));
}

function nestedValueKeys(section) {
  if (Array.isArray(section.valueKeys)) return section.valueKeys;
  return section.valueKey ? [section.valueKey] : [];
}

/**
 * Creates the single form-value record. Flat q-keys keep the existing database
 * contract, while the nested buckets reserve space for future sections.
 */
export function createInitialQuestionnaireValues() {
  const values = {};

  QUESTIONNAIRE_SECTIONS.forEach((section) => {
    (section.questions ?? []).forEach((question) => {
      values[question.key] = question.optional
        ? null
        : (question.defaultValue ?? DEFAULT_QUESTION_VALUE);
    });

    nestedValueKeys(section).forEach((key) => {
      values[key] = {};
    });
  });

  return values;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Clamps a persisted slider value into the configured range. */
export function normalizeQuestionValue(
  rawValue,
  fallback = DEFAULT_QUESTION_VALUE,
) {
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const numeric = Number(candidate);

  if (!Number.isFinite(numeric)) return fallback;

  return Math.min(QUESTION_MAX, Math.max(QUESTION_MIN, Math.round(numeric)));
}

/**
 * Merges persisted questionnaire values into the form record without dropping
 * reserved nested section buckets.
 */
export function hydrateQuestionnaireValues(baseValues, savedValues) {
  if (!isPlainObject(savedValues)) return baseValues;

  const next = { ...baseValues };

  Object.entries(savedValues).forEach(([key, rawValue]) => {
    const currentValue = next[key];

    if (isPlainObject(rawValue)) {
      next[key] = {
        ...(isPlainObject(currentValue) ? currentValue : {}),
        ...rawValue,
      };
      return;
    }

    if (key in next) {
      if (
        next[key] === null &&
        (rawValue === null || rawValue === undefined || rawValue === "")
      ) {
        next[key] = null;
        return;
      }

      next[key] = normalizeQuestionValue(rawValue, currentValue);
    }
  });

  return next;
}

/**
 * Transforms the form record into the payload sent to the Elixir API.
 *
 * Only visible questions are emitted so a male profile never persists the
 * female-only q11-q14 defaults. Non-empty future section buckets are preserved.
 */
export function buildQuestionnairePayload(formValues, audience) {
  const payload = {};

  QUESTIONNAIRE_SECTIONS.forEach((section) => {
    getQuestionsForAudience(section, audience).forEach((question) => {
      const rawValue = formValues[question.key];

      if (
        question.optional &&
        (rawValue === null || rawValue === undefined || rawValue === "")
      ) {
        return;
      }

      payload[question.key] = normalizeQuestionValue(
        rawValue,
        question.defaultValue ?? DEFAULT_QUESTION_VALUE,
      );
    });

    nestedValueKeys(section).forEach((key) => {
      const nestedValues = formValues[key];
      if (isPlainObject(nestedValues) && Object.keys(nestedValues).length > 0) {
        payload[key] = nestedValues;
      }
    });
  });

  return payload;
}
