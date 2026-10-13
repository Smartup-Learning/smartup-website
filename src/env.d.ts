/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    store?: import('../server/content-store.mjs').ContentStore;
  }
}
