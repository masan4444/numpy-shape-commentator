module.exports = {
    "extends": [
      "airbnb",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:jasmine/recommended"
    ],
    "plugins": [
      "import",
      "jasmine"
    ],
    "rules": {
        'no-plusplus': [2, { allowForLoopAfterthoughts: true }]
    },
    "env": {
        "browser": true,
        "es6": true,
        "jasmine": true
    },
    "settings": {
        "import/core-modules": ["atom"]
    },
    "globals": {
        "atom": true
    },
};
