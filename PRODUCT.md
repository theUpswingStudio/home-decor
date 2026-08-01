# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is decision-makers at home decor and other service businesses in the United States and Canada who are evaluating an agency to build a polished website that can generate qualified leads. They need evidence that the agency understands both presentation and the path from visitor interest to a useful business inquiry.

A secondary, represented audience is the imagined Vestrel House customer: a US or Canadian homeowner exploring furniture and planning an interior project before speaking with a design consultant.

## Product Purpose

Vestrel House is a fictional portfolio concept used to demonstrate the future agency's ability to create modern, polished, lead-oriented websites for home decor and service businesses. It should show more than implementation skill: it should make a credible case that the agency can structure a visitor journey that builds interest, supports consideration, and produces a qualified project inquiry.

Within the fictional experience, visitors browse an edited furniture catalog, develop a sense of a room or whole-home direction, save relevant selections, and move into consultation-led planning. Success means that an agency prospect can see a convincing example of both high-quality digital craft and intentional lead generation, while the represented homeowner journey remains coherent and useful.

## Positioning

The agency proposition is not merely that it can build a modern website. It is that it can pair polished, sector-aware presentation with a deliberate lead-generation journey for service businesses.

Vestrel House demonstrates that proposition through a curated whole-home catalog and consultation-led planning model: discovery by room, collection, look, and product leads into saved selections and a structured project inquiry rather than direct ecommerce checkout.

## Operating Context

Agency prospects encounter Vestrel House as a representative portfolio project when deciding whether the future agency can understand their market and generate leads for their business.

Inside the represented customer journey, a homeowner explores rooms, collections, looks, product details, materials, dimensions, lead-time guidance, and service information; saves planning selections locally; and completes a two-step consultation inquiry covering service, scope, location, timeline, investment, and contact details.

The concept is framed for the United States and serviceable Canadian destinations, uses USD catalog pricing, and presents consultation as the bridge between inspiration and a reviewed proposal.

## Capabilities and Constraints

- The web experience includes editorial discovery, catalog browsing, search and filtering, product variants and planning details, locally saved cart selections, design-service explanation, and a structured consultation inquiry demonstration.
- The curated whole-home catalog plus consultation-led planning is the confirmed core distinction of the represented Vestrel House concept.
- Vestrel House is not an operating company or retailer. It does not accept payments, create orders, reserve inventory, provide customer service, or transmit inquiries.
- Cart selections are stored only in the visitor's browser. Inquiry details remain in temporary page state and are not sent.
- Prices, variants, availability, lead times, policies, service coverage, and contact details are demonstration content rather than live commercial commitments.
- The agency itself is not yet named. How this portfolio concept will connect to the agency's own lead-capture path is an open product decision.

## Brand Commitments

Vestrel House remains a clearly disclosed fictional brand and portfolio showcase. Its product concept is an edited, consultation-led home furnishing experience organized around coherent rooms rather than an endless catalog or instant checkout.

The experience should communicate modern, polished craft and use clear, confident, transparent language. It must never blur demonstration content into claims about a real retailer, real customers, or active services.

## Evidence on Hand

- The structured fictional catalog, product details, rooms, collections, looks, policies, inquiry configuration, and disclosure copy live in `src/data/catalog.ts` and the routes under `src/app/`.
- The working consultation journey lives in `src/app/design-services/` and `src/components/inquiry/`; the local selection journey lives in `src/lib/cart/` and `src/components/cart/`.
- The Vestrel House brand mark is available at `public/brand/mark.svg`.
- Catalog and editorial photography uses credited Unsplash sources recorded alongside each image in `src/data/catalog.ts`. Context and lifestyle references are distinguished from exact fictional product representations.
- Automated coverage includes catalog, cart, inquiry, accessibility, SEO, navigation, and primary journey tests under `tests/` and `e2e/`.
- There are no real customers, orders, inquiries, testimonials, case studies, conversion results, inventory feeds, or business performance metrics. Future work must not fabricate them.

## Product Principles

1. Demonstrate business outcomes, not polish alone: every showcase decision should support a credible path toward qualified leads.
2. Qualify interest through useful context: help visitors understand the offer and provide the project details a service business needs for a productive follow-up.
3. Earn sector credibility through a complete journey: editorial discovery, practical product information, saved intent, and consultation should feel connected rather than staged as isolated screens.
4. Keep the fiction transparent: clearly distinguish portfolio demonstration, reference imagery, and sample content from real products, customers, and services.
5. Make trust part of conversion: accessibility, clear expectations, privacy boundaries, and honest operational constraints are essential to the lead-generation story.

## Accessibility & Inclusion

WCAG 2.2 AA is the required accessibility target. Core journeys must support keyboard and assistive-technology use, visible focus, reduced-motion preferences, clear labels and errors, meaningful image alternatives, and responsive use from a 320px-wide viewport upward.
