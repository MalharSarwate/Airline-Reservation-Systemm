# Data provenance

## Skyscanner reference sample

`data/skyscanner-reference-sample.json` contains two factual fare examples transcribed from public Skyscanner route-page search excerpts on 1 November 2026. Each record retains its source URL, displayed departure label, currency and collection method. Departure years were not explicit in the excerpts and have not been inferred. These are reference observations, not verified current offers or an official downloaded dataset.

This small reference sample is not imported into the application's flight inventory. It does not establish a licence for bulk collection or redistribution. Skyscanner API access requires an approved commercial agreement: https://www.partners.skyscanner.net/contact/travel-api

## Application database

V3__seed_flights.sql generates synthetic flights, schedules and fares. Aircraft layouts, cabin multipliers, baggage/meal charges and seat surcharges are demo assumptions. Accounts, holds and bookings are created locally by app users. None of these should be attributed to Skyscanner.

## Suggested project-report wording

“The application uses a synthetic reservation dataset for functional testing. A separate two-record fare reference sample was collected from public Skyscanner route-page search excerpts, with source links and observation date recorded. It is not a live Skyscanner integration.”
