import { IExecutable, IInjectable, Module } from "@boardmeister/marshal"
import type { DashboardContextType } from "@boardmeister/minstrel"
import type React from "react";

type IInjection = {
  react: typeof React,
  minstrel: DashboardContextType
  page: () => Promise<any>,
  page2: () => Promise<any>,
}

const Herald: IInjectable = class implements IExecutable {
  injected: IInjection;
  constructor(injections: IInjection) {
    this.injected = injections;
  }

  exec(): void {
    const { minstrel, react, page, page2 } = this.injected;
    minstrel.setRoute({
      path: '/',
      element: minstrel.lazy(page),
    })
    minstrel.setRoute({
      path: '/page2',
      element: minstrel.lazy(page2),
    })
    minstrel.addMenuItem({
      node: react.createElement('img', {
        src: minstrel.asset(this as Module, 'img.png'),
      }),
      items: [
        {
          label: 'Page2',
          link: '/page2'
        }
      ]
    })
    minstrel.addMenuItem({
      node: react.createElement('img', {
        src: minstrel.asset(this as Module, 'outline.png'),
      }),
      items: [
        {
          label: 'Page111',
          link: '/page2'
        },
        {
          label: 'Page222',
          link: '/page2'
        },
        {
          label: 'Page333',
          link: '/page2'
        }
      ]
    })
  }

  static inject(): Record<string, string> {
    return {
      'react': 'react/react:16.13.1',
      'minstrel': 'boardmeister/minstrel:latest',
      'subscribers': '!subscriber',
      page: 'vizier/herald-page:1.0.0',
      page2: 'vizier/herald-page2:1.0.0',
    }
  }
}

export default Herald;
