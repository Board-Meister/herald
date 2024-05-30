const HeraldPage = class {
    constructor(injections) {
        this.react = injections.react;
        const { minstrel } = injections;
        console.log('injections ', injections);
        console.log('main', minstrel.getMain());
    }
    page() {
        return this.react.createElement('h1', {}, 'PAGEE33');
    }
    static inject() {
        return {
            'react': 'react/react:16.13.1',
            'minstrel': 'boardmeister/minstrel:latest',
        };
    }
};
export default HeraldPage;
