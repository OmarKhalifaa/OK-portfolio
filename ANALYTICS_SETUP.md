# Portfolio analytics

Implementation and GA4 configuration record for 14 October 2026. The saved dashboard uses a standard GA4 overview report and Reports snapshot; linked Google documentation explains the measurement fields and report workflow. This file is not an importable dashboard.

## Current status

Analytics was deployed to Cloudflare Pages in commit `e6cb2d5`; 57 regression tests, the full build, and site validation passed. Enhanced measurement is off, all five custom dimensions are saved, and `contact_click` is registered as a key event with no monetary value and once-per-session counting. The live browser check confirmed no Google script before consent or after declining, and the correct Google tag after acceptance. **Portfolio Overview** is saved as the default **Reports snapshot**, with both project summary cards and dedicated project reports in the published **Portfolio → Projects** collection. The final snapshot and Realtime card still showed zero data; actual event receipt remains unverified.

| Configuration | Value |
| --- | --- |
| Account | Omar Khalifa Portfolio — `412052751` |
| Property | Omar Khalifa — Portfolio — `559016306` |
| Web stream | `16129945318` |
| Measurement ID | `G-QJ74NPRNS1` |
| Portfolio Overview report | `16130088759` |
| Project views detail report | `16130071117` |
| Project 30-second engagement detail report | `16130088782` |

Open the signed-in [Portfolio Reports snapshot](https://analytics.google.com/analytics/web/#/a412052751p559016306/reports/reportinghub?params=_u..nav%3Dmaui%26_u.dateOption%3DthisMonth%26_u.comparisonOption%3Ddisabled). The final browser view used **This month**, including 14 October; older trailing ranges may exclude today's activity.

Production URL: `https://omarkhalifaa.com`. The dashboard belongs inside the signed-in GA4 property.

The initial deployment used `ok-portfolio.pages.dev` as its canonical hostname. Commit `39c1e0f` was deployed and changes the public canonical domain to `omarkhalifaa.com` for SEO URLs and analytics; the `.pages.dev` host is excluded by the exact-host runtime guard. All 57 tests, the build, and site validation passed again. The existing GA4 web stream URL is saved as `https://omarkhalifaa.com`, with the same property, stream, measurement ID, and dashboard. A live custom-domain browser check confirmed the correct canonical URL and analytics hostname, no Google script before consent, and the correct tag after acceptance. The `.pages.dev` browser check confirmed no analytics notice or Google script. Actual GA4 event receipt remains unverified. Stream configuration evidence is saved at `.cache/analytics-custom-domain.png`. The CMS OAuth configuration continues to use its existing `.pages.dev` origin.

## Connect the web stream

1. Create or select the web stream for the production URL. Copy its `G-…` measurement ID from **Admin → Data streams → web stream**.
2. Turn **Enhanced measurement off** for this stream before deploying. The portfolio supplies its own page views and interaction events; automatic outbound-click, search, form, video, and download collection is unnecessary and can send additional URLs or parameters. Google documents these options in [Enhanced measurement events](https://support.google.com/analytics/answer/9216061?hl=en).
3. Keep Google signals and advertising personalization disabled. The code also sets advertising consent to denied and turns off related tag options.
4. `site.config.mjs` already defaults to `G-QJ74NPRNS1`. Set `GA_MEASUREMENT_ID` in the Cloudflare Pages **production** build environment if an override is needed, then redeploy using `npm run build`, output directory `dist`. Never deploy the repository root. The identifier is public configuration, not a password.

Local build verification in PowerShell:

```powershell
$env:GA_MEASUREMENT_ID = 'G-QJ74NPRNS1'
npm run check
```

An explicitly empty `GA_MEASUREMENT_ID` disables tracking and the consent UI; leaving the variable unset uses the configured fallback. `scripts/analytics.mjs` injects the first-party assets into public portfolio pages only. `js/analytics.js` additionally requires HTTPS and the exact configured production hostname. Localhost, preview hosts, admin/auth routes, prototypes, and draft preview builds do not track.

## What the code sends

No Google tag loads before **Allow analytics**. Declining leaves it unloaded; Analytics settings lets visitors change their choice. The choice expires after 180 days. Revoking consent disables subsequent events and removes accessible Google Analytics cookies.

| Event | Trigger | Additional parameters |
| --- | --- | --- |
| `page_view` | Once after consent on each public page load | Common context below |
| `project_view` | Once after consent on a case-study page | `project_slug` |
| `project_engaged` | Once after 30 cumulative seconds with the case study visible and focused after consent | `project_slug`, `active_time_msec` |
| `contact_click` | Clicking a mailto link | `contact_method: email`, `link_placement` |
| `social_click` | Clicking an HTTPS LinkedIn link | `social_platform: linkedin`, `link_placement` |

Common context: `page_type` (`home`, `about`, `projects`, or `project`), a cleaned `page_location`, cleaned `page_referrer`, and `project_slug` when on a project page. `gtag('set', ...)` applies the same context to automatic GA4 events. Query strings and fragments are removed from URLs; external referrers retain their origin only. Destination email addresses and LinkedIn profile URLs are not sent by the custom click events. GA4 may also generate its standard automatic events once the tag loads.

For campaign attribution, `utm_source`, `utm_medium`, and `utm_campaign` are copied to Google's `campaign_source`, `campaign_medium`, and `campaign_name` configuration fields only when each value matches `/^[a-zA-Z0-9_-]{1,80}$/`. Use short nonpersonal labels, for example `?utm_source=linkedin&utm_medium=social&utm_campaign=portfolio_launch`. Spaces, email/URL-shaped values, arbitrary query fields, `utm_content`, `utm_term`, and `gclid` are not forwarded by this code. The cleaned page URL remains free of its entire query string and fragment. Google's supported fields are documented in [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).

`project_engaged` is a threshold count, not an exact reading-time measurement or proof that the case study was read. `active_time_msec` avoids overwriting Google's own engagement timing; the overview uses event counts rather than this parameter as a custom metric. Contact and social clicks indicate intent; they do not prove an email was sent, an inquiry arrived, or a hiring conversation began. Reports represent visitors who accepted analytics and were measurable.

## Saved dimensions and contact key event

These five **Event** scoped dimensions are saved in **Admin → Data display → Custom definitions**. Keep the parameter names exact if recreating them. [Create event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696?hl=en)

| Dimension name | Event parameter | Description |
| --- | --- | --- |
| Page type | `page_type` | Public portfolio page category |
| Project | `project_slug` | Case-study identifier |
| Contact method | `contact_method` | Contact-link method |
| Social platform | `social_platform` | Social-link platform |
| Link placement | `link_placement` | `navigation`, `footer`, `hero`, `profile`, or `content` |

Use built-in page, device, source, and engagement fields instead of registering duplicate custom dimensions. Allow 24–48 hours after registration and receipt of data for custom dimensions to be available in reporting. [Custom dimensions and metrics](https://support.google.com/analytics/answer/14240153?hl=en)

**`contact_click`** is registered under **Admin → Data display → Events** as a key event, with **Once per session** counting and no monetary value. Its ordinary **Event count** still counts every tracked click. `project_view`, `project_engaged`, and `social_click` remain ordinary events. [Mark events as key events](https://support.google.com/analytics/answer/13128484?hl=en)

The overview shows contact intent through **Key events** and the **Event count by Event name** card. It has no saved contact-rate card. A stock rate card was removed after its visible filter proved to be `Event name exactly matches 'purchase'`; it was unsuitable for this portfolio.

## Saved Portfolio Overview

Four top metrics: **Active users**, **Sessions**, **Views**, and **Key events**. Eight saved cards:

| Card | Display | Filter or interpretation |
| --- | --- | --- |
| Engagement overview | Engagement-time trend and engaged-session metrics | Google's standard engagement metrics |
| Event count by Event name | Table | All received events, including contact/social clicks |
| Sessions by Session source / medium | Table | Acquisition sources |
| Views by Page title and screen class | Table | Popular pages |
| Active users by Device category | Donut | Device mix measured by active users |
| Realtime | Active users in the last 30 minutes | Live traffic indicator |
| Event count by Project — engagement | Table; links to Project 30-second engagement | Event name **contains** `project_engaged` |
| Event count by Project — views | Bar chart; links to Project views | Event name **contains** `project_view` |

Both dedicated project detail reports use **Project** as the default dimension, with **Event count** and **Total users**, sorted by Event count descending. Their summary cards apply the same event filters. The free-text **contains** operator allowed saving before any recent event values were available. Do not introduce other event names containing these strings without updating the filters.

For changes, open **Reports → Library → report menu → Edit**. Standard detail reports expose **Summary cards → Create new card**. Add them to a saved collection; publish that collection, then use **Add cards to this report** in the overview editor. Save changes to the existing report. Portfolio Overview remains the property's default Reports snapshot. [Create a summary card](https://support.google.com/analytics/answer/13819308?hl=en), [Customize report navigation](https://support.google.com/analytics/answer/10460557?hl=en), [Customize Reports snapshot](https://support.google.com/analytics/answer/10659091?hl=en)

The newer **Create dashboard** builder did not persist saves in this session. The working standard overview workflow completed the dashboard. A fresh bar summary card made project views separately selectable alongside the engagement table. Business objectives and Data import were unpublished to simplify this new property's sidebar; their reports were not deleted. **User** remains available for technology and audience reporting.

The project charts show views and threshold engagement separately; they do not imply a completion funnel or exact reading time. Use native **Session campaign** when investigating validated campaign labels.

## Verification and troubleshooting

- **No analytics notice:** Check the deployed `portfolio-analytics-config`, measurement ID, exact HTTPS production hostname, and saved consent choice. Local/preview/admin routes intentionally do not initialize it.
- **No Google tag:** Accept analytics in a clean session and check extensions/network blocking. Before consent and after declining, no tag is the expected result; that behavior passed the live browser check.
- **No project engagement:** Keep a case study visible and focused for 30 seconds after acceptance. Hidden and unfocused time does not count.
- **No report data:** Check GA4 Realtime for actual event arrival. Loading the tag alone does not establish receipt. Custom dimensions can take 24–48 hours after registration and receipt of data. Verify chart event filters and date range.
- **Contact counts differ:** Ordinary Event count counts every click; the configured Key events count is once per session. Neither means an inquiry was received.
- **Regression checks:** `node --test tests/analytics.test.mjs` and `npm run check` cover consent, clean URLs, campaign validation, event context, engagement timing, revocation, and excluded routes. The full suite passed 57 tests, build, and site validation.

For an authenticated GA4 Data API check, use `properties/559016306:runReport` with these dimensions/metrics and **the same** date range (for example `28daysAgo` through `yesterday`). Custom dimensions require registration first. [Google Data API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)

| Evidence query | Dimensions | Metrics | Dimension filter |
| --- | --- | --- | --- |
| Project views | `customEvent:project_slug` | `eventCount`, `totalUsers` | `eventName` exactly `project_view` |
| Project 30s engagements | `customEvent:project_slug` | `eventCount`, `totalUsers` | `eventName` exactly `project_engaged` |
| Contact clicks | `customEvent:link_placement` | `eventCount`, `totalUsers` | `eventName` exactly `contact_click` |
| Device sessions | `deviceCategory` | `sessions`, `totalUsers` | None |

These queries are verification instructions, not executed results.

## Completion record

- [x] Web stream created; account/property/stream IDs and measurement ID recorded.
- [x] Enhanced measurement disabled.
- [x] All five custom dimensions registered.
- [x] 57 regression tests, full build, and site validation passed.
- [x] `contact_click` registered as a key event; no monetary value, once-per-session key-event counting.
- [x] Production build configured and deployed with the real measurement ID in `e6cb2d5`.
- [x] Live consent check: no Google script before consent or after decline; correct Google tag after acceptance.
- [ ] Accepted production events observed in GA4 Realtime.
- [x] Portfolio Overview saved as Reports snapshot and verified in the actual reporting view.
- [x] Project views and Project 30-second engagement reports saved; summary cards included in the snapshot.
- [x] Portfolio collection published and verified in the sidebar.
- [x] Final month-to-date dashboard screenshot saved at `.cache/portfolio-analytics-dashboard.png`.
- [ ] Custom project/click data verified after processing.
