import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

// Keep these tags in sync with the editor components in src/pages/admin/index.astro.
export default defineMarkdocConfig({
  tags: {
    button: {
      render: component('./src/components/markdoc/Button.astro'),
      selfClosing: true,
      attributes: {
        href: { type: String, required: true },
        label: { type: String, required: true },
      },
    },
    youtube: {
      render: component('./src/components/markdoc/YouTube.astro'),
      selfClosing: true,
      attributes: {
        id: { type: String, required: true },
      },
    },
  },
});
