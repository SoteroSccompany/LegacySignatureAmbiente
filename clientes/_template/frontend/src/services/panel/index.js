import { jsonConfig } from "../../Config";
import { panelMock } from "./mock";
import { panelApi } from "./api";

export const getPanelService = () => {
  if (jsonConfig.uiMock) return panelMock;
  return panelApi;
};

export { clearPanelMockState } from "./mock";
export * from "./types";
