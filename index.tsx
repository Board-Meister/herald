import { IExecutable, IInjectable } from "@boardmeister/marshal"
import type { DashboardContextType } from "@boardmeister/minstrel"
import type React from "react";

const Herald: IInjectable = class implements IExecutable {
  constructor(injections: {
    react: typeof React,
    minstrel: DashboardContextType
    page: () => Promise<any>,
  }) {
    const { minstrel, page } = injections;
    console.log('page', page)
    console.log('injections', injections)
    console.log('main', minstrel.getMain())
    if (!page) {
      throw new Error('Missing page')
    }
    minstrel.setRoute({
      path: '/',
      element: minstrel.lazy(page),
    })
  }

  exec(): void {
    console.log("I'm proclaiming 235!")
  }

  static inject(): Record<string, string> {
    return {
      'react': 'react/react:16.13.1',
      'minstrel': 'boardmeister/minstrel:latest',
      'subscribers': '!subscriber',
      page: 'vizier/herald-page:1.0.0',
    }
  }
}

export default Herald;
