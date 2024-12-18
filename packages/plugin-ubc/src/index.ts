import { Plugin } from '@ai16z/eliza';
import { checkUBCBalance } from './actions/balance';

const ubcPlugin: Plugin = {
    name: "ubc-plugin",
    description: "UBC integration plugin",
    actions: [checkUBCBalance],
    evaluators: [],
    providers: [],
    services: []
};

export default ubcPlugin;