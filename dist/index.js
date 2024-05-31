const Herald = class {
    constructor(injections) {
        this.injected = injections;
    }
    static inject() {
        return {
            'react': 'react/react:16.13.1',
            'subscribers': '!subscriber',
        };
    }
};
export default Herald;
