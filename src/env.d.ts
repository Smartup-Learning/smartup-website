/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    runtime?: {
      env?: {
        DB?: D1Database;
        MEDIA?: R2Bucket;
        ADMIN_PASSWORD?: string;
        [key: string]: any;
      };
    };
    store?: import('./lib/d1-store').D1Store;
    origin?: string;
  }
}
