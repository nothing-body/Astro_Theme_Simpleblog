// postcss.config.cjs
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('autoprefixer'),
    // Purge unused CSS in production builds
    require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.astro',
        './src/**/*.tsx',
        './src/**/*.ts',
        './src/**/*.js',
        './src/content/**/*.md',
        './src/content/**/*.mdx'
      ],
      defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || [],
      safelist: {
        standard: [
          'glow',
          'glass-card',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'blockquote',
          'pre',
          'code',
          'img',
          'hr',
          'p',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'task-list-item'
        ],
        deep: [
          /data-directive/,
          /data-line/
        ],
        greedy: [
          /data-directive/
        ]
      },
    }),
  ],
};
