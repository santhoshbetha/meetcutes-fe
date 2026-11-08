import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "./ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogTitle } from "./ui/dialog";
import { HandleChecker } from "./HandleChecker";
import {
  useHandleAvailabilityQuery,
  useSetHandleMutation,
} from "@/hooks/useProfileQueries";
import { describeApiError } from "@/lib/api";
import { toast } from "sonner";

const HANDLE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,14}$/;

export function HandleCard({ onClose }) {
  const navigate = useNavigate();
  const [handletext, setHandletext] = useState("");
  const [debouncedHandle, setDebouncedHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const [valid, setValid] = useState(false);

  const setHandleMutation = useSetHandleMutation();
  const trimmedHandle = handletext.trim();

  const handleValidity = useMemo(() => {
    return {
      minChar: trimmedHandle.length >= 5,
      maxChar: trimmedHandle.length <= 15,
      firstChar: /^[A-Za-z]/.test(trimmedHandle),
      specialChar:
        trimmedHandle.length > 0 && /^[A-Za-z0-9_]*$/.test(trimmedHandle),
    };
  }, [trimmedHandle]);

  const constraintsSatisfied = HANDLE_PATTERN.test(trimmedHandle);

  // Debounce the network check so every keystroke does not hit Phoenix.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHandle(trimmedHandle);
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmedHandle]);

  const availabilityQuery = useHandleAvailabilityQuery(debouncedHandle, {
    enabled: constraintsSatisfied,
  });

  const checkedHandle = String(availabilityQuery.data?.handle ?? "").trim();
  const handleMatchesChecked =
    checkedHandle.length > 0 &&
    checkedHandle.toLowerCase() === trimmedHandle.toLowerCase();

  useEffect(() => {
    setValid(
      Boolean(
        constraintsSatisfied &&
          handleMatchesChecked &&
          !availabilityQuery.isFetching &&
          availabilityQuery.data?.available,
      ),
    );
  }, [
    constraintsSatisfied,
    handleMatchesChecked,
    availabilityQuery.data,
    availabilityQuery.isFetching,
  ]);

  const closePanel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleHandleSubmit = async (e) => {
    e.preventDefault();

    if (!valid || loading) return;

    setLoading(true);

    try {
      await setHandleMutation.mutateAsync(trimmedHandle);
      toast.success("Username handle assigned successfully!");
      closePanel();
    } catch (error) {
      toast.error(
        describeApiError(error, "Unable to assign this handle. Please try again."),
      );
      setValid(false);
      availabilityQuery.refetch();
    } finally {
      setLoading(false);
    }
  };

  const availabilityMessage = (() => {
    if (!constraintsSatisfied) return null;
    if (availabilityQuery.isFetching) return "Checking availability...";
    if (!availabilityQuery.data) return null;
    if (!handleMatchesChecked) return null;

    return availabilityQuery.data.available
      ? "Handle is available."
      : "This handle is already taken.";
  })();

  return (
    <DialogContent className="w-[90%] sm:max-w-[425px] relative">
      <DialogTitle></DialogTitle>
      {loading && (
        <Spinner
          className="absolute top-[50%] left-[50%] z-50 cursor-pointer"
          size="medium"
        />
      )}
      <CardHeader>
        <CardTitle className="text-2xl">Create Handle</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="" onSubmit={handleHandleSubmit}>
          <Label>Enter a unique handle name for your account</Label>
          <Input
            type="text"
            className="form-control mt-2"
            name="handletext"
            placeholder=""
            onFocus={() => setHandleFocused(true)}
            value={handletext}
            onChange={(e) => {
              setHandletext(e.target.value.trim());
              setValid(false);
            }}
            autoFocus
          />
          {availabilityMessage && (
            <p
              className={`mt-2 text-xs font-medium ${
                availabilityQuery.data?.available && handleMatchesChecked
                  ? "text-green-600"
                  : "text-red-700"
              }`}
            >
              {availabilityMessage}
            </p>
          )}
          <div className="flex mt-3">
            <Button
              variant="outline"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                closePanel();
              }}
            >
              Cancel
            </Button>
            <Button
              className="ms-auto bg-green-700"
              type="submit"
              disabled={!valid || loading}
            >
              Submit
            </Button>
          </div>
        </form>
        {handleFocused && !valid && <HandleChecker validity={handleValidity} />}
      </CardContent>
    </DialogContent>
  );
}

export default HandleCard;
