const utilityScale = Array.from({ length: 201 }, (_, value) => value)
  .filter((value) => value % 2 === 0 || value % 5 === 0)
  .map((value) => `${value}px`)

const utilityFontSizes = utilityScale.filter((value) => value !== '0px')

const globalStyleFiles = ['src/app/styles/**/*.scss']

const legacyStyleFiles = [
  'src/app/router/ui/RouteErrorPage.module.scss',
  'src/pages/dashboard/ui/DashboardPage.module.scss',
  'src/pages/placeholder/ui/PlaceholderPage.module.scss',
  'src/shared/ui/language-switcher/LanguageSwitcher.module.scss',
  'src/shared/ui/metric-card/MetricCard.module.scss',
  'src/shared/ui/theme-switcher/ThemeSwitcher.module.scss',
  'src/widgets/app-layout/ui/AppLayout.module.scss',
]

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreDisables: true,
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
    {
      files: globalStyleFiles,
      rules: {
        'color-named': null,
        'color-no-hex': null,
        'function-disallowed-list': null,
        // The global layer defines tokens and implements the tld-* utility classes.
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      files: legacyStyleFiles,
      rules: {
        'selector-class-pattern': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
  ],
  rules: {
    'color-named': ['never', { message: 'Use a semantic --color-* token instead of a named color.' }],
    'color-no-hex': [true, { message: 'Use a semantic --color-* token instead of a hex color.' }],
    'color-hex-length': null,
    'custom-property-empty-line-before': null,
    'declaration-block-single-line-max-declarations': null,
    'declaration-property-value-keyword-no-deprecated': null,
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      { message: 'Use lowercase kebab-case class names.' },
    ],
    'value-keyword-case': null,
    'declaration-property-value-disallowed-list': [
      {
        display: ['flex', 'inline-flex', 'grid', 'inline-grid'],
        'flex-direction': ['row', 'column'],
        'flex-wrap': ['wrap', 'nowrap'],
        'align-items': ['flex-start', 'center', 'flex-end', 'stretch'],
        'align-self': ['flex-start', 'center', 'flex-end'],
        'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
        'flex-grow': ['0', '1'],
        'flex-shrink': ['0', '1'],
        'font-size': utilityFontSizes,
        '/^(margin|padding)(-.+)?$/': utilityScale,
        '/^(gap|row-gap|column-gap)$/': utilityScale,
      },
      {
        message: 'Use the equivalent tld- utility class instead of duplicating a shared style declaration.',
        reportDisables: true,
      },
    ],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: 'Use a semantic --color-* token instead of a raw color function.' },
    ],
  },
}
