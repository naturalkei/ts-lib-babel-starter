# ts-lib-babel-starter

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/628a17ff37c24f179896b83036fbb26c)](https://www.codacy.com/app/Euiyeon/ts-lib-babel-starter?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Euiyeon/ts-lib-babel-starter&amp;utm_campaign=Badge_Grade)
[![CircleCI](https://circleci.com/gh/Euiyeon/ts-lib-babel-starter.svg?style=svg)](https://circleci.com/gh/Euiyeon/ts-lib-babel-starter)
[![codecov](https://codecov.io/gh/Euiyeon/ts-lib-babel-starter/branch/master/graph/badge.svg)](https://codecov.io/gh/Euiyeon/ts-lib-babel-starter)
[![Known Vulnerabilities](https://snyk.io//test/github/Euiyeon//ts-lib-babel-starter/badge.svg?targetFile=package.json)](https://snyk.io//test/github/Euiyeon//ts-lib-babel-starter?targetFile=package.json)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

typescript-based javascript library starter package

based on <https://github.com/bitjson/typescript-starter>

[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

## features

* [x] typescript3
* [x] tslint
* [x] standard js
* [x] ava + nyc
* [x] gulp4 task runner
* [x] babel + browserify bundler

### continuous integration

* [Codacy](https://www.codacy.com) - Automated code reviews & code analytics
* [CircleCI](https://circleci.com) - Continuous Integration and Delivery
* [codecov](https://codecov.io) - leading, dedicated code coverage
* [snyk.io](https://snyk.io) - Continuously find and fix vulnerabilities for npm

## build

```sh
yarn build
```
or
```sh
gulp build
```

### build output

```plain
├── dist        -- UMD, minified
├── build
|  ├── main     -- Common JS
|  ├── module   -- ES Modules
```

### gulp tasks

#### common js

* name: `build:cjs`
* dest: `build/main/**`

#### es modules

* name: `build:esm`
* dest: `build/module/**`

#### umd

dependent gulp tasks: `build:esm`

* name: `build:umd`
* dest: `dist/**`

## test

```sh
yarn test
```

### code coverage

```sh
yarn cov:check
```

## todo
* [ ] ..
    
## license

[MIT](./LICENSE)
