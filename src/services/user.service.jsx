import { logout as logoutRequest } from "@/services/auth.service";
import {
  checkHandleAvailable,
  deactivateAccount,
  fetchMyProfile,
  fetchProfileById,
  updateMyProfile,
} from "@/services/profile.service";

function failure(error, fallback = "Something went wrong. Please try again.") {
  return {
    success: false,
    msg: error?.message || fallback,
  };
}

/**
 * Compatibility helpers for components that have not moved to
 * `useProfileQueries` yet. The `userid` argument is intentionally ignored:
 * the backend always scopes writes to the bearer token.
 */
export const getProfileData = async (userid) => {
  try {
    const data = userid ? await fetchProfileById(userid) : await fetchMyProfile();
    return { success: true, data };
  } catch (error) {
    return failure(error);
  }
};

export const getUserProfile = async (userid) => {
  try {
    const data = await fetchProfileById(userid);
    return { success: true, data };
  } catch (error) {
    return failure(error, "User profile not found");
  }
};

export const updateUserInfo = async (_userid, data) => {
  try {
    const profile = await updateMyProfile(data);
    return { success: true, data: profile };
  } catch (error) {
    return failure(error);
  }
};

export const checkIfHandleTaken = async (handle) => {
  try {
    const result = await checkHandleAvailable(handle);
    return {
      success: true,
      handleTaken: result.taken,
      available: result.available,
    };
  } catch (error) {
    return failure(error);
  }
};

export const logoutUser = async () => {
  try {
    await logoutRequest();
    return { success: true };
  } catch (error) {
    return failure(error);
  }
};

export const deleteUser = async () => {
  try {
    await deactivateAccount();
    return {
      success: true,
      msg: "Account deactivated successfully",
    };
  } catch (error) {
    return failure(error);
  }
};
