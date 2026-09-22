/**
 * Tailwind CSS v4 is configured through its PostCSS plugin; theme tokens live
 * in `src/app/globals.css` rather than in a JavaScript config file.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
