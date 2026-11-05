import next from 'eslint-config-next/core-web-vitals'

export default [
  ...next,
  {
    // The admin pages load data in effects by design; flag it, do not fail on it.
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  { ignores: ['.next/**', '.open-next/**', 'node_modules/**'] },
]
