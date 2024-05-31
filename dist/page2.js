const page = (react, dom) => {
    const navigate = dom.useNavigate();
    return react.createElement('h1', {}, 'This is second page', react.createElement('a', { onClick: () => {
            navigate('/');
        } }, 'HOME'));
};
const HeraldPage = class {
    constructor(injections) {
        this.react = injections.react;
        this.dom = injections.dom;
        console.log('injected dome', this.dom);
    }
    page() {
        return page(this.react, this.dom);
    }
    static inject() {
        return {
            'react': 'react/react:16.13.1',
            'minstrel': 'boardmeister/minstrel:latest',
            'dom': 'react/dom:latest',
        };
    }
};
export default HeraldPage;
