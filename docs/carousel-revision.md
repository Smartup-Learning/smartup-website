# Carousel and content revision

11 September 2026. Implements the user's eight requested refinements while preserving the approved Smartup identity.

- App downloads have one home: the top ribbon, with Apple and Android logos.
- Stories use the videos themselves without a coloured frame or player toolbar. Existing bottom titles and captions remain.
- Photo testimonials follow stories. Quotes and portraits are fictional placeholders with visible disclosure.
- Media is visual: the original Kerala Kaumudi article image plus a clearly labelled video-coverage placeholder.
- Stories, testimonials, media, learning formats and teachers share manual horizontal navigation. No auto-advance or cloned cards.
- Removed Life at Smartup, the bottom app promotion, duplicate summaries, repeated result descriptions and redundant FAQ entries. Essential programme and centre information remains.
- Visible text reduced from 1,205 to 745 whitespace-separated words, excluding script/style/noscript.

## Sources

Teacher identity and credentials come from the client's `Faculty Photos/FULL TIME STAFFS/` filenames:

| Asset | Source |
| --- | --- |
| Aflah K. R., Academic Head, MSc/BEd | Existing client photo; Drive `16BdGfyJ2MA3Lja18NovSqD5wI54bebWv` |
| Liya Justin, Mathematics, MSc/MEd, KTET 2 & 3 | Drive `11mUkY8uyeZBtLUW5EOeVrqV70oOSgyRO` |
| Hunais NK, Botany, MSc, Aligarh Muslim University | Drive `1aAXn83EMhbiwkMHK6rn4uXQfDxphgx8N` |
| Anjali Anand, Chemistry, MSc/BEd, KTET 2 & 3 | Drive `1krzQCV_acmYZw7knQiQnD9KWPRCCHXy0`; CSS framing excludes surrounding phone screenshot |
| News image | [Kerala Kaumudi original photograph](https://keralakaumudi.com/web-news/2022/10/NEKM0241840/image/1.1665144582.webp), [article](https://keralakaumudi.com/news/news.php?id=919001&u=local-news-ernakulam) |
| Additional Toppers Talk video | [Alfiya Jennath](https://www.youtube.com/watch?v=6TnxqTfDG0A), verified through YouTube oEmbed |
| Video-coverage placeholder | [Smartup cultural celebration](https://www.youtube.com/watch?v=HIIvMixMM8Q), verified through YouTube oEmbed; not represented as independent press coverage |
| Platform symbols | Font Awesome brand SVGs, [Apple](https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/brands/apple.svg) and [Android](https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/brands/android.svg); embedded licence comments preserved |

## Generated testimonial assets

Generated with the built-in image tool, then encoded as web-optimised WebP. These people are fictional and are not represented as Smartup customers.

Common prompt direction: square head-and-shoulders natural editorial portrait, centered face with shoulder space, South Indian subject, approachable expression, authentic skin texture, warm cream background, quiet purple clothing, natural side-window light, no text/logos/props. Subjects: woman aged 40; woman aged 18; man aged 43.

Files: `dist/assets/placeholders/parent-woman.webp`, `student-woman.webp`, `parent-man.webp`. Replace both image and quote with approved client material before removing sample labels. The photos are lazy-loaded and total approximately 92KB.

## Interaction design

Native horizontal overflow and scroll snap work without JavaScript. JavaScript adds labelled previous/next controls, disables them at the edges, and updates after scrolling/resizing. A focused rail supports ArrowLeft/ArrowRight and Home/End. Focus inside cards retains normal behaviour. Reduced-motion uses immediate scrolling. Videos load only on play; one player can be active. Native YouTube controls handle pause/resume. Starting another video restores the previous poster. Custom close overlays, the hero toolbar and the stories footnote were removed in the subsequent media refinement. Testimonial photos use 4:3 top-centred framing, retaining full faces.

Current checks and earlier audit evidence are in `qa.md`. The prior audit remains historical; this revision supersedes its descriptions of three app-link placements and framed video cards.
