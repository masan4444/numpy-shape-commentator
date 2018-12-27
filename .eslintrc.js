module.exports = {
    "extends": ["airbnb", "plugin:import/errors", "plugin:import/warnings"],
    "rules": {
        'no-plusplus': [2, { allowForLoopAfterthoughts: true }]
    },
    "env": {
        "browser": true,
        "es6": true
    },
    "settings": {
        "import/core-modules": ["atom"]
    },
    "globals": {
        "atom": true
    },
};
