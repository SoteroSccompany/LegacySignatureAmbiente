import { jsonConfig } from "../../Config";
import { identityMock, hasIdentityPartial as hasIdentityPartialMock, hasPending2FA as hasPending2FAMock } from "./mock";
import { identityApi, hasIdentityPartialApi, hasPending2FAApi } from "./api";
import { NEXT_STEP, resolveNextRoute, hasFullSession } from "./types";
import {
  setPendingAssinar,
  getPendingAssinar,
  clearPendingAssinar,
  setPendingAssinarEmail,
  getPendingAssinarEmail,
  clearPendingAssinarEmail,
  setAssinarSkipBiometriaOnboarding,
  getAssinarSkipBiometriaOnboarding,
  clearAssinarSkipBiometriaOnboarding,
} from "./pendingAssinar";

export const getIdentityService = () => {
  if (jsonConfig.uiMock) return identityMock;
  return identityApi;
};

export const hasIdentityPartial = () =>
  jsonConfig.uiMock ? hasIdentityPartialMock() : hasIdentityPartialApi();

export const hasPending2FA = () =>
  jsonConfig.uiMock ? hasPending2FAMock() : hasPending2FAApi();

export {
  NEXT_STEP,
  resolveNextRoute,
  hasFullSession,
  setPendingAssinar,
  getPendingAssinar,
  clearPendingAssinar,
  setPendingAssinarEmail,
  getPendingAssinarEmail,
  clearPendingAssinarEmail,
  setAssinarSkipBiometriaOnboarding,
  getAssinarSkipBiometriaOnboarding,
  clearAssinarSkipBiometriaOnboarding,
};
