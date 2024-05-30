const Herald = class {
    constructor(injections) {
        const { minstrel, page } = injections;
        console.log('page', page);
        console.log('injections', injections);
        console.log('main', minstrel.getMain());
        if (!page) {
            throw new Error('Missing page');
        }
        minstrel.setRoute({
            path: '/',
            element: minstrel.lazy(page),
        });
    }
    exec() {
        console.log("I'm proclaiming 235!");
    }
    static inject() {
        return {
            'react': 'react/react:16.13.1',
            'minstrel': 'boardmeister/minstrel:latest',
            'subscribers': '!subscriber',
            page: 'vizier/herald-page:1.0.0',
        };
    }
};
export default Herald;
