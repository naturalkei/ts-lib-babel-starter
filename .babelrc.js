module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // targets: {
        //   esmodules: true
        // }
        target: {
          browsers: [
            '> 0.25%, not dead',
          ]
        },
        modules: 'umd'
      }
    ],
    'minify',
  ],
  plugins: [
    '@babel/plugin-transform-async-to-generator'
  ],
  comments: false,
}
