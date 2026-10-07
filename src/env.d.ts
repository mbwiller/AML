/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Glossary ids whose sticky card `<template>` has already been emitted on
     * the page being rendered, so a term used twenty times costs one copy.
     * Set by src/components/mdx/StickyCard.astro.
     */
    stickyCards?: Set<string>;
  }
}
