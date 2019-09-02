/**
 * https://github.com/istanbuljs/nyc#common-configuration-options
 * https://github.com/istanbuljs/istanbuljs
 * https://www.npmjs.com/package/@istanbuljs/nyc-config-typescript
 */
module.exports = {
  extends: '@istanbuljs/nyc-config-typescript',
  'check-coverage': false,
  all: true,
  instrument: true,
  extension: [
    '.ts'
  ],
  include: [
    'src/**/*.ts'
  ],
  exclude: [
    '**/*.d.ts'
  ]
}
