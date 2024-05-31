import { IInjectable, ILazy } from "@boardmeister/marshal"
import type { DashboardContextType } from "@boardmeister/minstrel"
import type React from "react";
import type DOM from 'react-router-dom';

const page = (react: typeof React, dom: typeof DOM): React.ReactNode => {
  const navigate = dom.useNavigate();
  return react.createElement('h1', {}, 'This is second page', react.createElement('a', {onClick: () => {
      navigate('/');
    }}, 'HOME'
  ))
}

const HeraldPage: IInjectable = class implements ILazy {
  react: typeof React;
  dom: typeof DOM;

  constructor(injections: {
    react: typeof React,
    minstrel: DashboardContextType,
    dom: typeof DOM,
  }) {
    this.react = injections.react;
    this.dom = injections.dom;
    console.log('injected dome', this.dom)
  }

  page(): React.ReactNode {
    return page(this.react, this.dom);
  }

  static inject(): Record<string, string> {
    return {
      'react': 'react/react:16.13.1',
      'minstrel': 'boardmeister/minstrel:latest',
      'dom': 'react/dom:latest',
    }
  }
}

export default HeraldPage;
