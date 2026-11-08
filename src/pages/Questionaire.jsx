import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { Spinner } from "@/components/ui/spinner";
import { QuestionnaireSection } from "@/components/questionnaire/QuestionnaireSection";
import { useAuth } from "@/context/AuthContext";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import { successAlert, errorAlert } from "@/services/alert.service";
import { isObjEmpty } from "@/utils/util";
import {
  QUESTIONNAIRE_SECTIONS,
  buildQuestionnairePayload,
  createInitialQuestionnaireValues,
  hydrateQuestionnaireValues,
  resolveAudience,
  resolveQuestionnaireSections,
} from "@/data/questionnaireSections";

export default function Questionaire() {
  const [loading, setLoading] = useState(false);
  const { profiledata } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation();
  const navigate = useNavigate();

  // One flat record owns every answer. Nested buckets reserve room for the
  // upcoming integrity / cognitive / empathy sections.
  const [formValues, setFormValues] = useState(createInitialQuestionnaireValues);
  const [valueschanged, setValueschanged] = useState(false);
  const editedRef = useRef(false);

  const [confirmClick, setConfirmClick] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState(false);

  const savedQuestionnaireValues = profiledata?.questionairevalues;
  const isReadOnly = profiledata?.questionairevaluesset === true;

  const audience = useMemo(
    () => resolveAudience(profiledata?.gender),
    [profiledata?.gender],
  );

  const sections = useMemo(
    () => resolveQuestionnaireSections(QUESTIONNAIRE_SECTIONS, audience),
    [audience],
  );

  // Hydrate the single form record once the profile (and any saved answers)
  // arrives. User edits always win over a late profile refresh.
  useEffect(() => {
    if (editedRef.current || !savedQuestionnaireValues) return;

    setFormValues((current) =>
      hydrateQuestionnaireValues(current, savedQuestionnaireValues),
    );
  }, [savedQuestionnaireValues]);

  const handleQuestionChange = useCallback((questionKey, value) => {
    editedRef.current = true;
    setValueschanged(true);
    setFormValues((current) => ({
      ...current,
      [questionKey]: value,
    }));
  }, []);

  function handlePopupClose() {
    setConfirmPopup(false);
  }

  function handleBackNavigation(e) {
    e.preventDefault();
    navigate(-1);
  }

  const clickQuestionaireSubmissionConfirm = async (e) => {
    e.preventDefault();
    setConfirmClick(true);
  };

  const handleQuestionnaireSubmit = async (event) => {
    event.preventDefault();

    if (isReadOnly || loading) return;

    setLoading(true);

    try {
      const questionairevalues = buildQuestionnairePayload(formValues, audience);

      await updateProfileMutation.mutateAsync({
        questionairevalues,
        questionairevaluesset: true,
      });

      successAlert("", "Questionnaire submitted successfully!");
      navigate("/dashboard");
    } catch (error) {
      errorAlert("Error", error?.message || "Failed to submit questionnaire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container variant="fullMobileBreakpointPadded" className="py-6">
      <Card className="border-0 bg-transparent shadow-none backdrop-blur-none">
        {loading && (
          <Spinner
            className="fixed top-[50%] left-[50%] z-50 cursor-pointer"
            size="large"
          />
        )}

        {confirmPopup && (
          <div className="popup-alert">
            <Alert>
              <AlertTitle>
                This is one time submission. Cannot be reversed. Press to
                confirm.
              </AlertTitle>
              <AlertDescription>
                <div className="flex justify-between mt-3">
                  <Button
                    variant="outline"
                    onClick={handlePopupClose}
                    disabled={confirmClick}
                  >
                    <span className="p-0 text-md">X</span>
                  </Button>
                  {!confirmClick ? (
                    <Button
                      data-dismiss="modal"
                      disabled={confirmClick}
                      onClick={(e) => {
                        clickQuestionaireSubmissionConfirm(e);
                      }}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <LoadingButton className="text-white" loading>
                      Confirming...
                    </LoadingButton>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex flex-row items-center me-3">
          <button
            type="button"
            className="text-red-700 rounded bg-transparent border-0 ms-auto"
            onClick={handleBackNavigation}
            aria-label="Close questionnaire"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              width="14"
              viewBox="0 0 384 512"
              fill=""
            >
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
            </svg>
          </button>
        </div>

        <CardHeader className="px-0">
          <div className="mb-4 flex justify-start">
            <Button type="button" variant="outline" onClick={handleBackNavigation}>
              <span aria-hidden="true" className="me-2">
                &larr;
              </span>
              <span>Back</span>
            </Button>
          </div>
          <CardTitle className="text-2xl">Questionnaire</CardTitle>

          {!isReadOnly && !isObjEmpty(profiledata?.questionairevaluesset) && (
            <div>
              <h4>
                Please slide the options below towards the direction your
                thoughts align on each. Be honest about your preferences.
              </h4>
              <p className="text-sm text-muted-foreground mt-2">
                💡 <strong>Middle position</strong> = Neutral/No strong
                preference • <strong>Slide left</strong> = Lean toward left
                option • <strong>Slide right</strong> = Lean toward right option
              </p>
            </div>
          )}

          {isReadOnly && <h4>Your questionnaire values:</h4>}
        </CardHeader>

        <CardContent className="px-0">
          <form role="form" onSubmit={handleQuestionnaireSubmit}>
            {sections.map((section) => (
              <QuestionnaireSection
                key={section.id}
                section={section}
                values={formValues}
                onChange={handleQuestionChange}
                disabled={isReadOnly}
              />
            ))}

            {!isReadOnly && (
              <div className="flex flex-row mt-3" hidden={!valueschanged}>
                <Button
                  type="submit"
                  className="ms-auto me-2"
                  disabled={loading}
                >
                  Submit
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
