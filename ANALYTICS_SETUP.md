# Portfolio analytics

Setup recipe checked against the implementation and official Google documentation on 14 October 2026. This file describes the configuration to apply in GA4; it is not an importable dashboard or evidence that reports already exist.

## Current status

The local tracking implementation is configured with the real web-stream ID; 57 regression tests, the full build, and site validation passed. The following Google Analytics account and stream were created, with Egypt reporting time zone and EGP currency. Enhanced measurement is off. The **Project** and **Page type** custom dimensions are saved. Remaining definitions, live deployment, received events, and the Portfolio Overview report still need the completion checks below.

| Configuration | Value |
| --- | --- |
| Account | Omar Khalifa Portfolio — `412052751` |
| Property | Omar Khalifa — Portfolio — `559016306` |
| Web stream | `16129945318` |
| Measurement ID | `G-QJ74NPRNS1` |

Open the signed-in [GA4 property](https://analytics.google.com/analytics/web/#/a412052751p559016306/reports/intelligenthome).

Production URL: `https://ok-portfolio.pages.dev`. The dashboard belongs inside the signed-in GA4 property; publishing a report collection makes it available to property users, rather than publishing it on the portfolio.

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

## Register dimensions and the contact key event

In **Admin → Data display → Custom definitions**, create these five **Event** scoped custom dimensions. Enter the event parameter exactly as shown. Google explains registration in [Create event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696?hl=en).

| Dimension name | Event parameter | Description |
| --- | --- | --- |
| Page type | `page_type` | Public portfolio page category |
| Project | `project_slug` | Case-study identifier |
| Contact method | `contact_method` | Contact-link method |
| Social platform | `social_platform` | Social-link platform |
| Link placement | `link_placement` | `navigation`, `footer`, `hero`, `profile`, or `content` |

Use built-in page, device, source, and engagement fields instead of registering duplicate custom dimensions. Allow 24–48 hours after registration and receipt of data for custom dimensions to be available in reporting. [Custom dimensions and metrics](https://support.google.com/analytics/answer/14240153?hl=en)

Mark **`contact_click`** as a key event in **Admin → Data display → Events**. If it has not arrived yet, choose **Create event → Create with code**, name it `contact_click`, and enable **Mark as key event**. Use **Once per session**, with no monetary value. Do not create a derived duplicate of the event already sent by the site. Leave `project_view`, `project_engaged`, and `social_click` as ordinary events. [Mark events as key events](https://support.google.com/analytics/answer/13128484?hl=en), [Create or modify key events](https://support.google.com/analytics/answer/12844695?hl=en)

**Session key event rate for contact_click** means sessions with a contact click divided by all measured sessions. Do not divide click count by users, or filter the entire traffic report to `contact_click`: either would change the meaning of the denominator. When selecting key-event metrics, select `contact_click` rather than All events.

## Build Portfolio Overview

With Editor or Administrator access, create the following detail reports in **Reports → Library**. Start from the corresponding standard report or a blank detail report, set the dimensions/metrics and saved filter below, then save under the specified name. For event reports, sort by Event count descending. For traffic/device reports, sort by Sessions descending. [Customize detail reports](https://support.google.com/analytics/answer/10445879?hl=en)

| Detail report name | Default dimension; optional picker dimensions | Metrics | Saved filter |
| --- | --- | --- | --- |
| Portfolio Traffic | Session source / medium; Session default channel group, Session campaign | Sessions, Total users, Engaged sessions, Engagement rate, Key events, Session key event rate | None; select `contact_click` for key-event metrics |
| Project Views | Project; Page path and screen class | Event count, Total users | Event name exactly `project_view` |
| Project Engagement 30s | Project; Page path and screen class | Event count, Total users | Event name exactly `project_engaged` |
| Contact Clicks | Link placement; Contact method, Page type, Project | Event count, Total users | Event name exactly `contact_click` |
| LinkedIn Clicks | Link placement; Social platform, Page type, Project | Event count, Total users | Event name exactly `social_click` |
| Portfolio Devices | Device category; Browser | Sessions, Total users, Engagement rate, Session key event rate | None; select `contact_click` for key-event rate |

If event values or custom dimensions have not populated, finish that report after the first accepted live visit and processing delay. An empty report is not verification of tracking failure or success.

For each detail report, use **Customize report → Summary cards → Create new card**. Configure these overview cards; add the event filter to the event card itself as well as its detail report. [Create a summary card](https://support.google.com/analytics/answer/13819308?hl=en)

| Card title | Source report | Chart/data |
| --- | --- | --- |
| Traffic trend | Portfolio Traffic | Line chart over the selected date range; Sessions and Total users |
| Visitor sources | Portfolio Traffic | Table: Session source / medium, Sessions |
| Most viewed projects | Project Views | Bar chart: Project, Event count; `project_view` filter |
| Projects explored for 30s | Project Engagement 30s | Bar chart: Project, Event count; `project_engaged` filter |
| Email contact clicks | Contact Clicks | Table: Link placement, Event count; `contact_click` filter |
| LinkedIn clicks | LinkedIn Clicks | Table: Link placement, Event count; `social_click` filter |
| Devices | Portfolio Devices | Bar chart: Device category, Sessions |
| Sessions with a contact click | Portfolio Traffic | Table: Session source / medium, Session key event rate with `contact_click` selected |

Create a blank collection named **Portfolio**, with one topic named **Overview**, and add the six detail reports to it. Save it first so their custom summary cards can be selected. Then create an overview report named **Portfolio Overview**, add the eight cards in the order above, save, and add it to the Overview topic. Publish the collection from its menu in Library. Optionally set Portfolio Overview as **Reports snapshot**. Use **Last 28 days**, compared with the preceding period, during review; the viewer selects the date range. [Create an overview report](https://support.google.com/analytics/answer/13823841?hl=en), [Customize report navigation](https://support.google.com/analytics/answer/10460557?hl=en), [Customize Reports snapshot](https://support.google.com/analytics/answer/10659091?hl=en)

This configuration deliberately shows project views and threshold engagement as separate counts. It does not claim a strict project completion funnel or a ratio of unique readers.

## Verify collection and reporting

1. Run `node --test tests/analytics.test.mjs` and `npm run check`. The analytics regression tests cover consent, URL cleaning, campaign value validation, automatic-event context, page/project events, focused engagement timing, click payloads, revocation, and excluded hosts/routes. The full suite passed 57 tests, build, and site validation during implementation. These checks exercise the local implementation; they do not establish that Google received an event.
2. After deploying the real ID, inspect the built production HTML for `portfolio-analytics-config`. Visit the actual production site in a clean browser session. Before allowing analytics, verify no Google tag or measurement requests. Decline and confirm that remains true.
3. Allow analytics, open a case study, keep it visible and focused for 30 seconds, and click email/LinkedIn links. Inspect outgoing requests for the correct stream ID, one manual `page_view`, `project_view`, `project_engaged`, `contact_click`, and `social_click`. Verify page/referrer URLs have no query strings or fragments, custom click payloads have no email destinations or profile URLs, and only validated campaign labels are forwarded. Check GA4 Realtime for actual arrival.
4. Revoke consent and confirm later interactions send no events. Verify a preview hostname and `/admin/` do not initialize analytics.
5. After processing, confirm Project rows, campaign labels, and event filters in the saved reports. Confirm contact click rate against measured sessions, including sessions without contact clicks.

For an authenticated GA4 Data API check, use `properties/559016306:runReport` with these dimensions/metrics and **the same** date range (for example `28daysAgo` through `yesterday`). Custom dimensions require registration first. [Google Data API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)

| Evidence query | Dimensions | Metrics | Dimension filter |
| --- | --- | --- | --- |
| Project views | `customEvent:project_slug` | `eventCount`, `totalUsers` | `eventName` exactly `project_view` |
| Project 30s engagements | `customEvent:project_slug` | `eventCount`, `totalUsers` | `eventName` exactly `project_engaged` |
| Contact clicks | `customEvent:link_placement` | `eventCount`, `totalUsers` | `eventName` exactly `contact_click` |
| Contact session rate | `sessionSourceMedium` | `sessions`, `sessionKeyEventRate:contact_click` | None |
| Device sessions | `deviceCategory` | `sessions`, `totalUsers` | None |

The API contact rate is returned as a fraction; format it as a percentage. These queries are verification instructions, not executed results.

## Completion record

- [x] Web stream created; account/property/stream IDs and measurement ID recorded.
- [x] Enhanced measurement disabled.
- [x] Project and Page type custom dimensions registered.
- [ ] Contact method, Social platform, and Link placement custom dimensions registered.
- [x] 57 regression tests, full build, and site validation passed.
- [ ] `contact_click` designated as a key event.
- [ ] Production build configured and deployed with the real measurement ID.
- [ ] Accepted production events observed in GA4 Realtime.
- [ ] Portfolio Overview and Portfolio collection saved and visible in GA4.
- [ ] Custom project/click data verified after processing.
