import { IInjectable } from "@boardmeister/marshal"
import type { DashboardContextType } from "@boardmeister/minstrel"
import type React from "react";

type IInjection = {
  react: typeof React,
  minstrel: DashboardContextType
}

const Herald: IInjectable = class {
  injected: IInjection;
  constructor(injections: IInjection) {
    this.injected = injections;
  }

  static inject(): Record<string, string> {
    return {
      'react': 'react/react:16.13.1',
      'subscribers': '!subscriber',
    }
  }
}

export default Herald;
