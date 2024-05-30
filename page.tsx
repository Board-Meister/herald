import { IInjectable, ILazy } from "@boardmeister/marshal"
import type { DashboardContextType } from "@boardmeister/minstrel"
import type React from "react";

const HeraldPage: IInjectable = class implements ILazy {
  react: typeof React;

  constructor(injections: {
    react: typeof React,
    minstrel: DashboardContextType
  }) {
    this.react = injections.react;
    const { minstrel } = injections;
    console.log('injections ', injections)
    console.log('main', minstrel.getMain())
  }

  page(): React.ReactNode {
    return this.react.createElement('h1', {}, 'PAGEE33')
  }

  static inject(): Record<string, string> {
    return {
      'react': 'react/react:16.13.1',
      'minstrel': 'boardmeister/minstrel:latest',
    }
  }
}

export default HeraldPage;
